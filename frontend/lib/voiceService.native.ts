import { registerGlobals } from 'react-native-webrtc'
import { VoiceService } from './mediasoup/VoiceService'

export type { VoiceState, VoiceStateListener, PeerInfo, DeviceInfo } from './mediasoup/types'

// Expone navigator.mediaDevices, MediaStream, RTCPeerConnection... como globals para que
// mediasoup-client y el código compartido funcionen igual que en el navegador.
registerGlobals()

// Antes este archivo usaba rutas HTTP /voice/* que ya no existen en el backend y el handler
// 'ReactNative', eliminado en mediasoup-client 3.18. Ahora comparte la implementación con web.
export const voiceService = new VoiceService({ handlerName: 'ReactNative106' })
