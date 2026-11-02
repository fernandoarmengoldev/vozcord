import type { Consumer } from 'mediasoup-client/types'

export interface PeerInfo {
    userId: string
    peerId: string
    audioConsumer?: Consumer
    videoConsumer?: Consumer
    audioStream?: MediaStream
    videoStream?: MediaStream
    producers?: { id: string; kind: 'audio' | 'video' }[]
    // Estado de mute remoto (producer pausado)
    audioPaused?: boolean
    videoPaused?: boolean
}

export interface VoiceState {
    connected: boolean
    peers: Map<string, PeerInfo>
    audioEnabled: boolean
    videoEnabled: boolean
}

export type VoiceStateListener = (state: VoiceState) => void

export interface DeviceInfo {
    inputs: MediaDeviceInfo[]
    outputs: MediaDeviceInfo[]
    videoInputs: MediaDeviceInfo[]
}
