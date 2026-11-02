import { VoiceService } from './mediasoup/VoiceService'

export type { VoiceState, VoiceStateListener, PeerInfo, DeviceInfo } from './mediasoup/types'

// Servicio de voz para web (mediasoup-client detecta el navegador)
export const voiceService = new VoiceService()
