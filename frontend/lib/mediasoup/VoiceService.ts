import { Device } from 'mediasoup-client'
import type { Transport, Consumer, BuiltinHandlerName } from 'mediasoup-client/types'
import type { VoiceState, VoiceStateListener, PeerInfo, DeviceInfo } from './types'
import { VoiceStateManager } from './state'
import { createSendTransport, createRecvTransport } from './transport'
import {
    initializeLocalStream,
    toggleAudio as toggleAudioMedia,
    toggleVideo as toggleVideoMedia,
    enumerateDevices as enumerateMediaDevices,
    switchInputDevice as switchAudioInput,
    switchVideoInputDevice as switchVideoInput,
    switchOutputDevice as switchAudioOutput,
} from './media'
import { joinRoom as joinVoiceRoom, consumeMedia } from './peers'
import { getVoiceWebSocketClient } from './voiceWebSocket'

export interface VoiceServiceOptions {
    // Handler de mediasoup-client. En web se autodetecta; en React Native hay que
    // forzar 'ReactNative106' (el antiguo 'ReactNative' ya no existe en mediasoup-client 3.18)
    handlerName?: BuiltinHandlerName
}

/**
 * Servicio de voz/vídeo (mediasoup) común a web y React Native.
 * En nativo funciona porque react-native-webrtc registra los globals
 * (navigator.mediaDevices, MediaStream, RTCPeerConnection...) con registerGlobals().
 */
export class VoiceService {
    private device?: Device
    private sendTransport?: Transport
    private recvTransport?: Transport
    private channelId: string = ''
    private peerId: string = ''
    private userId: string = ''
    private localStream?: MediaStream
    private selectedInputDeviceId: string | null = null
    private selectedOutputDeviceId: string | null = null
    private connecting = false

    private stateManager = new VoiceStateManager()

    constructor(private options: VoiceServiceOptions = {}) {}

    // Suscribirse a cambios de estado
    subscribe(listener: VoiceStateListener): () => void {
        return this.stateManager.subscribe(listener)
    }

    // Obtener estado actual
    getState(): VoiceState {
        return this.stateManager.getState()
    }

    // Conectar a un canal de voz
    async connect(channelId: string, userId: string): Promise<void> {
        if (this.connecting) {
            throw new Error('Ya se está conectando a un canal de voz')
        }
        // Si ya estaba en otra llamada, salir primero
        if (this.stateManager.getState().connected || this.device) {
            this.disconnect()
        }

        this.connecting = true
        try {
            this.channelId = channelId
            this.userId = userId
            this.peerId = `${userId}-${Date.now()}`

            const wsClient = getVoiceWebSocketClient()
            await wsClient.connect()

            wsClient.setEventCallbacks({
                onPeerJoined: (peerId, joinedUserId, eventChannelId) => {
                    // La presencia se emite a todo el servidor: ignorar otros canales y a uno mismo
                    if (eventChannelId !== this.channelId || peerId === this.peerId) return
                    if (!this.stateManager.getPeer(peerId)) {
                        this.stateManager.setPeer(peerId, { userId: joinedUserId, peerId })
                    }
                },
                onPeerLeft: (peerId, eventChannelId) => {
                    if (eventChannelId !== this.channelId) return
                    this.removePeer(peerId)
                },
                onProducerCreated: (peerId, producerId, kind, eventChannelId) => {
                    if (eventChannelId !== this.channelId || peerId === this.peerId) return
                    this.consumeProducer(peerId, producerId, kind).catch((error) => {
                        console.error('[VoiceService] Error consuming media:', error)
                    })
                },
                onProducerPaused: (producerId, peerId) => this.setRemotePaused(peerId, producerId, true),
                onProducerResumed: (producerId, peerId) => this.setRemotePaused(peerId, producerId, false),
                onConnectionLost: () => {
                    // El backend ya nos ha sacado de la sala: limpiar el estado local
                    if (this.device) {
                        console.warn('[VoiceService] Conexión de voz perdida')
                        this.cleanupLocal()
                    }
                    wsClient.setEventCallbacks({})
                },
            })

            const { rtpCapabilities } = await wsClient.request('get-rtp-capabilities', { channelId })

            this.device = this.options.handlerName
                ? new Device({ handlerName: this.options.handlerName })
                : new Device()
            await this.device.load({ routerRtpCapabilities: rtpCapabilities })

            const peersData = await joinVoiceRoom(
                this.channelId,
                this.peerId,
                this.userId,
                this.device.rtpCapabilities
            )

            this.stateManager.clearPeers()
            for (const peer of peersData) {
                this.stateManager.setPeer(peer.peerId, { userId: String(peer.userId), peerId: peer.peerId })
            }

            this.sendTransport = await createSendTransport(this.device, this.channelId, this.peerId)
            this.recvTransport = await createRecvTransport(this.device, this.channelId, this.peerId)

            // Consumir los producers que ya existían en la sala
            for (const peer of peersData) {
                if (peer.peerId === this.peerId || !Array.isArray(peer.producers)) continue
                for (const producer of peer.producers) {
                    await this.consumeProducer(peer.peerId, producer.id, producer.kind).catch((error) => {
                        console.error('[VoiceService] Error consuming initial producer:', error)
                    })
                }
            }

            this.localStream = await initializeLocalStream(this.selectedInputDeviceId)

            const audioTrack = this.localStream.getAudioTracks()[0]
            if (audioTrack) {
                const audioProducer = await this.sendTransport.produce({ track: audioTrack })
                this.stateManager.setProducers(audioProducer, undefined)
            }

            this.stateManager.setConnected(true)
        } catch (error) {
            console.error('[VoiceService] Error connecting to voice channel:', error)
            // Antes, si fallaba (p. ej. permiso de micro denegado) el peer quedaba "fantasma" en la sala
            this.disconnect()
            throw error
        } finally {
            this.connecting = false
        }
    }

    // Consumir un producer remoto y asociarlo al peer
    private async consumeProducer(peerId: string, producerId: string, kind: 'audio' | 'video'): Promise<void> {
        if (!this.recvTransport || !this.device) return

        const { consumer } = await consumeMedia(
            peerId,
            producerId,
            this.recvTransport,
            this.device,
            this.channelId,
            this.peerId
        )

        const existing = this.stateManager.getPeer(peerId) ?? { peerId, userId: peerId.split('-')[0] ?? peerId }
        const update: Partial<PeerInfo> = {}
        if (kind === 'audio') {
            existing.audioConsumer?.close()
            update.audioConsumer = consumer
            update.audioStream = new MediaStream([consumer.track])
            update.audioPaused = false
        } else {
            existing.videoConsumer?.close()
            update.videoConsumer = consumer
            update.videoStream = new MediaStream([consumer.track])
            update.videoPaused = false
        }
        this.stateManager.setPeer(peerId, { ...existing, ...update })

        // Si el transport se cierra, limpiar el consumer de ese peer
        consumer.on('transportclose', () => this.clearConsumer(peerId, consumer))
    }

    private clearConsumer(peerId: string, consumer: Consumer) {
        const current = this.stateManager.getPeer(peerId)
        if (!current) return
        if (current.audioConsumer === consumer) {
            this.stateManager.setPeer(peerId, { ...current, audioConsumer: undefined, audioStream: undefined })
        } else if (current.videoConsumer === consumer) {
            this.stateManager.setPeer(peerId, { ...current, videoConsumer: undefined, videoStream: undefined })
        }
    }

    private setRemotePaused(peerId: string, producerId: string, paused: boolean) {
        const peer = this.stateManager.getPeer(peerId)
        if (!peer) return
        if (peer.audioConsumer?.producerId === producerId) {
            this.stateManager.setPeer(peerId, { ...peer, audioPaused: paused })
        } else if (peer.videoConsumer?.producerId === producerId) {
            this.stateManager.setPeer(peerId, { ...peer, videoPaused: paused })
        }
    }

    private removePeer(peerId: string) {
        const peer = this.stateManager.getPeer(peerId)
        // Cerrar los consumers del peer (antes quedaban abiertos)
        peer?.audioConsumer?.close()
        peer?.videoConsumer?.close()
        this.stateManager.removePeer(peerId)
    }

    // Mutear/desmutear micrófono
    async toggleAudio(): Promise<void> {
        const { audio } = this.stateManager.getProducers()
        await toggleAudioMedia(audio, this.channelId, this.peerId)
        this.stateManager.notifyListeners()
    }

    // Activar/desactivar video
    async toggleVideo(): Promise<void> {
        const { audio, video } = this.stateManager.getProducers()

        const result = await toggleVideoMedia(video, this.localStream, this.channelId, this.peerId)

        if (result.needsProducer && result.videoTrack && this.sendTransport) {
            result.videoTrack.enabled = true
            const videoProducer = await this.sendTransport.produce({ track: result.videoTrack })
            this.stateManager.setProducers(audio, videoProducer)
        }

        this.stateManager.notifyListeners()
    }

    // Liberar recursos locales (sin avisar al backend)
    private cleanupLocal(): void {
        const { audio, video } = this.stateManager.getProducers()

        audio?.close()
        video?.close()
        this.sendTransport?.close()
        this.recvTransport?.close()
        this.localStream?.getTracks().forEach((track) => track.stop())

        this.device = undefined
        this.sendTransport = undefined
        this.recvTransport = undefined
        this.localStream = undefined
        this.stateManager.reset()
    }

    // Desconectar de la llamada. El WebSocket se mantiene abierto porque también
    // se usa para la presencia del servidor (antes se cerraba y la presencia dejaba de funcionar).
    disconnect(): void {
        try {
            const wasInRoom = !!this.device
            this.cleanupLocal()

            const wsClient = getVoiceWebSocketClient()
            wsClient.setEventCallbacks({})
            if (wasInRoom && wsClient.isConnected()) {
                wsClient.request('leave-room', {
                    channelId: this.channelId,
                    peerId: this.peerId,
                }).catch(() => {
                    // Si falla, el backend limpia al cerrar el socket
                })
            }
        } catch (error) {
            console.error('Error disconnecting:', error)
        }
    }

    // Obtener stream local
    getLocalStream(): MediaStream | undefined {
        return this.localStream
    }

    // Enumerar dispositivos disponibles
    async enumerateDevices(): Promise<DeviceInfo> {
        return await enumerateMediaDevices()
    }

    // Cambiar dispositivo de entrada de audio
    async switchInputDevice(deviceId: string): Promise<void> {
        this.selectedInputDeviceId = deviceId
        if (!this.localStream) return
        const { audio } = this.stateManager.getProducers()
        this.localStream = await switchAudioInput(deviceId, audio, this.localStream)
        this.stateManager.notifyListeners()
    }

    // Cambiar dispositivo de entrada de video
    async switchVideoInputDevice(deviceId: string): Promise<void> {
        if (!this.localStream) return
        const { video } = this.stateManager.getProducers()
        this.localStream = await switchVideoInput(deviceId, video, this.localStream)
        this.stateManager.notifyListeners()
    }

    // Cambiar dispositivo de salida de audio
    async switchOutputDevice(deviceId: string): Promise<void> {
        this.selectedOutputDeviceId = deviceId
        await switchAudioOutput(deviceId)
    }

    // Obtener dispositivos seleccionados
    getSelectedDevices(): {
        inputDeviceId: string | null
        outputDeviceId: string | null
        videoInputDeviceId: string | null
    } {
        return {
            inputDeviceId: this.selectedInputDeviceId,
            outputDeviceId: this.selectedOutputDeviceId,
            videoInputDeviceId: this.localStream?.getVideoTracks()[0]?.getSettings().deviceId || null,
        }
    }

    // Establecer preferencias de dispositivos
    setDevicePreferences(inputDeviceId: string | null, outputDeviceId: string | null): void {
        this.selectedInputDeviceId = inputDeviceId
        this.selectedOutputDeviceId = outputDeviceId
    }
}
