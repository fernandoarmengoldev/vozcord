import type { Producer } from 'mediasoup-client/types'
import type { PeerInfo, VoiceState, VoiceStateListener } from './types'

// Gestión de estado del servicio de voz
export class VoiceStateManager {
    private peers: Map<string, PeerInfo> = new Map()
    private listeners: VoiceStateListener[] = []
    private audioProducer?: Producer
    private videoProducer?: Producer
    private connected: boolean = false

    subscribe(listener: VoiceStateListener): () => void {
        this.listeners.push(listener)
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener)
        }
    }

    getState(): VoiceState {
        return {
            connected: this.connected,
            // Copia: si se devuelve el mismo Map, useMemo/React no detectan los cambios
            peers: new Map(this.peers),
            audioEnabled: this.audioProducer ? !this.audioProducer.paused : false,
            videoEnabled: this.videoProducer ? !this.videoProducer.paused : false,
        }
    }

    notifyListeners(): void {
        const state = this.getState()
        this.listeners.forEach((listener) => listener(state))
    }

    setConnected(connected: boolean): void {
        this.connected = connected
        this.notifyListeners()
    }

    setProducers(audio?: Producer, video?: Producer): void {
        if (audio) this.audioProducer = audio
        if (video) this.videoProducer = video
        this.notifyListeners()
    }

    getProducers(): { audio?: Producer; video?: Producer } {
        return {
            audio: this.audioProducer,
            video: this.videoProducer,
        }
    }

    setPeer(peerId: string, peerInfo: PeerInfo): void {
        this.peers.set(peerId, peerInfo)
        this.notifyListeners()
    }

    getPeer(peerId: string): PeerInfo | undefined {
        return this.peers.get(peerId)
    }

    removePeer(peerId: string): void {
        this.peers.delete(peerId)
        this.notifyListeners()
    }

    clearPeers(): void {
        this.peers.clear()
        this.notifyListeners()
    }

    reset(): void {
        this.peers.clear()
        this.audioProducer = undefined
        this.videoProducer = undefined
        this.connected = false
        this.notifyListeners()
    }
}
