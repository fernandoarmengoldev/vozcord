import type { Device, Transport, Consumer } from 'mediasoup-client/types'
import { getVoiceWebSocketClient } from './voiceWebSocket'

// Consumir media de un peer remoto
export async function consumeMedia(
    peerId: string,
    producerId: string,
    recvTransport: Transport,
    device: Device,
    channelId: string,
    selfPeerId: string
): Promise<{ consumer: Consumer; kind: 'audio' | 'video' }> {
    const wsClient = getVoiceWebSocketClient()

    const { id, kind, rtpParameters } = await wsClient.request('consume', {
        channelId,
        peerId: selfPeerId,
        transportId: recvTransport.id,
        producerId,
        rtpCapabilities: device.rtpCapabilities,
    })

    const consumer = await recvTransport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
    })

    return { consumer, kind }
}

export interface RoomPeer {
    userId: string
    peerId: string
    producers: { id: string; kind: 'audio' | 'video' }[]
}

// Unirse a la sala y obtener lista de peers
export async function joinRoom(
    channelId: string,
    peerId: string,
    userId: string,
    rtpCapabilities: any
): Promise<RoomPeer[]> {
    const wsClient = getVoiceWebSocketClient()

    const { peers } = await wsClient.request('join-room', {
        channelId,
        peerId,
        userId,
        rtpCapabilities,
    })

    return peers || []
}
