import type {
    Router,
    Transport,
    Producer,
    Consumer,
    DtlsParameters,
    MediaKind,
    RtpParameters,
    RtpCapabilities,

} from 'mediasoup/types'
import { mediasoupServer } from './server'
import { config } from './config'

interface Peer {
    id: string
    userId: string
    rtpCapabilities?: RtpCapabilities
    transports: Map<string, Transport>
    producers: Map<string, Producer>
    consumers: Map<string, Consumer>
}

interface Room {
    id: string
    channelId: string
    router: Router
    peers: Map<string, Peer>
}

class RoomManager {
    private rooms: Map<string, Room> = new Map()
    private pendingRooms: Map<string, Promise<Room>> = new Map()

    async createRoom(channelId: string): Promise<Room> {
        if (this.rooms.has(channelId)) {
            return this.rooms.get(channelId)!
        }

        // Evitar crear dos routers si llegan dos peticiones simultáneas para el mismo canal
        const pending = this.pendingRooms.get(channelId)
        if (pending) return pending

        const promise = (async () => {
            const router = await mediasoupServer.createRouter()
            const room: Room = {
                id: channelId,
                channelId,
                router,
                peers: new Map(),
            }

            this.rooms.set(channelId, room)
            console.log(`mediasoup - Room creada para canal: ${channelId}`)
            return room
        })()

        this.pendingRooms.set(channelId, promise)
        try {
            return await promise
        } finally {
            this.pendingRooms.delete(channelId)
        }
    }

    getRoom(channelId: string): Room | undefined {
        return this.rooms.get(channelId)
    }

    async deleteRoom(channelId: string): Promise<void> {
        const room = this.rooms.get(channelId)
        if (!room) return

        // Cerrar todos los peers
        for (const peer of room.peers.values()) {
            await this.removePeer(channelId, peer.id)
        }

        // Cerrar el router libera sus recursos en el worker (antes nunca se cerraba)
        room.router.close()
        this.rooms.delete(channelId)
        console.log(`mediasoup - Room eliminada para canal: ${channelId}`)
    }

    addPeer(channelId: string, peerId: string, userId: string, rtpCapabilities?: RtpCapabilities): Peer {
        const room = this.rooms.get(channelId)
        if (!room) throw new Error('Room no encontrada')

        if (room.peers.has(peerId)) {
            const existingPeer = room.peers.get(peerId)!
            // Actualizar rtpCapabilities si se proporcionan y no están ya guardadas
            if (rtpCapabilities && !existingPeer.rtpCapabilities) {
                existingPeer.rtpCapabilities = rtpCapabilities
                console.log(`mediasoup - RTP capabilities guardadas para peer existente ${peerId}`)
            }
            return existingPeer
        }

        const peer: Peer = {
            id: peerId,
            userId,
            rtpCapabilities,
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
        }

        room.peers.set(peerId, peer)
        console.log(`mediasoup - peer ${peerId} unido a room ${channelId}`)
        return peer
    }

    getPeer(channelId: string, peerId: string): Peer | undefined {
        const room = this.rooms.get(channelId)
        return room?.peers.get(peerId)
    }

    async removePeer(channelId: string, peerId: string): Promise<void> {
        const room = this.rooms.get(channelId)
        if (!room) return

        const peer = room.peers.get(peerId)
        if (!peer) return

        // Cerrar todos los transports
        for (const transport of peer.transports.values()) {
            transport.close()
        }

        // Los producers y consumers se cierran automáticamente con los transports
        room.peers.delete(peerId)
        console.log(`mediasoup - peer ${peerId} removido de room ${channelId}`)

        // Si la room está vacía, eliminarla después de 1 minuto
        if (room.peers.size === 0) {
            setTimeout(() => {
                // Comprobar que sigue siendo la misma room (podría haberse recreado entretanto)
                if (this.rooms.get(channelId) === room && room.peers.size === 0) {
                    this.deleteRoom(channelId)
                }
            }, 60 * 1000) // 1 minuto
        }
    }

    async createWebRtcTransport(
        channelId: string,
        peerId: string
    ): Promise<{
        id: string
        iceParameters: any
        iceCandidates: any
        dtlsParameters: any
    }> {
        const room = this.rooms.get(channelId)
        if (!room) throw new Error('Room no encontrada')

        const peer = room.peers.get(peerId)
        if (!peer) throw new Error('Peer no encontrado')

        const transport = await room.router.createWebRtcTransport({
            // Todos los transports comparten el puerto del WebRtcServer
            webRtcServer: mediasoupServer.getWebRtcServer(room.router),
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate:
                config.webRtcTransport.initialAvailableOutgoingBitrate,
        })

        if (config.webRtcTransport.maxIncomingBitrate) {
            try {
                await transport.setMaxIncomingBitrate(config.webRtcTransport.maxIncomingBitrate)
            } catch {
                // No crítico
            }
        }

        peer.transports.set(transport.id, transport)

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        }
    }

    async connectTransport(
        channelId: string,
        peerId: string,
        transportId: string,
        dtlsParameters: DtlsParameters
    ): Promise<void> {
        const peer = this.getPeer(channelId, peerId)
        if (!peer) throw new Error('Peer no encontrado')

        const transport = peer.transports.get(transportId)
        if (!transport) throw new Error('Transport no encontrado')

        await transport.connect({ dtlsParameters })
    }

    async produce(
        channelId: string,
        peerId: string,
        transportId: string,
        kind: MediaKind,
        rtpParameters: RtpParameters
    ): Promise<string> {
        const peer = this.getPeer(channelId, peerId)
        if (!peer) throw new Error('Peer no encontrado')

        const transport = peer.transports.get(transportId)
        if (!transport) throw new Error('Transport no encontrado')

        const producer = await transport.produce({ kind, rtpParameters })
        peer.producers.set(producer.id, producer)

        console.log(`mediasoup - producer creado: ${producer.id} (${kind}) para peer ${peerId}`)

        return producer.id
    }

    async consume(
        channelId: string,
        peerId: string,
        transportId: string,
        producerId: string,
        rtpCapabilities: RtpCapabilities
    ): Promise<{
        id: string
        kind: MediaKind
        rtpParameters: RtpParameters
        producerId: string
    }> {
        const room = this.rooms.get(channelId)
        if (!room) throw new Error('Room no encontrada')

        const peer = this.getPeer(channelId, peerId)
        if (!peer) throw new Error('Peer no encontrado')

        const transport = peer.transports.get(transportId)
        if (!transport) throw new Error('Transport no encontrado')

        // Verificar si el router puede consumir
        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
            throw new Error('No se puede consumir este producer')
        }

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: false,
        })

        peer.consumers.set(consumer.id, consumer)

        console.log(`mediasoup - consumer creado: ${consumer.id} para peer ${peerId} del producer ${producerId}`)

        return {
            id: consumer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
            producerId: consumer.producerId,
        }
    }

    async pauseProducer(
        channelId: string,
        peerId: string,
        producerId: string
    ): Promise<void> {
        const peer = this.getPeer(channelId, peerId)
        if (!peer) throw new Error('Peer no encontrado')

        const producer = peer.producers.get(producerId)
        if (!producer) throw new Error('Producer no encontrado')

        await producer.pause()
    }

    async resumeProducer(
        channelId: string,
        peerId: string,
        producerId: string
    ): Promise<void> {
        const peer = this.getPeer(channelId, peerId)
        if (!peer) throw new Error('Peer no encontrado')

        const producer = peer.producers.get(producerId)
        if (!producer) throw new Error('Producer no encontrado')

        await producer.resume()
    }

    getRoomPeers(channelId: string): string[] {
        const room = this.rooms.get(channelId)
        if (!room) return []

        return Array.from(room.peers.values()).map((peer) => peer.userId)
    }

    getRoomStateDetailed(channelId: string): {
        userId: string
        peerId: string
        producers: { id: string; kind: MediaKind }[]
    }[] {
        const room = this.rooms.get(channelId)
        if (!room) return []

        const peersState = Array.from(room.peers.values()).map((peer) => ({
            userId: peer.userId,
            peerId: peer.id,
            producers: Array.from(peer.producers.values()).map((producer) => ({
                id: producer.id,
                kind: producer.kind,
            })),
        }))

        return peersState
    }

    // Rooms con peers activos (para enviar el estado inicial de presencia)
    getActiveRooms(): { channelId: string; peers: { userId: string; peerId: string }[] }[] {
        return Array.from(this.rooms.values())
            .filter((room) => room.peers.size > 0)
            .map((room) => ({
                channelId: room.channelId,
                peers: Array.from(room.peers.values()).map((peer) => ({ userId: peer.userId, peerId: peer.id })),
            }))
    }

    getRouterRtpCapabilities(channelId: string): RtpCapabilities | undefined {
        const room = this.rooms.get(channelId)
        return room?.router.rtpCapabilities
    }
}

export const roomManager = new RoomManager()
