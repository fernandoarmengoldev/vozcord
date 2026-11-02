import { useEffect, useState } from 'react'
import { voiceService, type VoiceState } from './voiceService'

/**
 * Hook de React para gestionar el estado de voz/video
 *
 * @returns Objeto con el estado y funciones para controlar voz/video
 *
 * @example
 * ```tsx
 * function VoiceChannel() {
 *   const voice = useVoice()
 *
 *   return (
 *     <View>
 *       <Button onPress={() => voice.connect('channel-id', 'user-id')}>
 *         {voice.connected ? 'Desconectar' : 'Conectar'}
 *       </Button>
 *
 *       {voice.connected && (
 *         <>
 *           <Button onPress={voice.toggleAudio}>
 *             {voice.audioEnabled ? 'Mutear' : 'Desmutear'}
 *           </Button>
 *           <Button onPress={voice.toggleVideo}>
 *             {voice.videoEnabled ? 'Apagar video' : 'Encender video'}
 *           </Button>
 *
 *           <Text>Peers conectados: {voice.peers.size}</Text>
 *         </>
 *       )}
 *     </View>
 *   )
 * }
 * ```
 */
export function useVoice() {
  const [state, setState] = useState<VoiceState>(voiceService.getState())

  useEffect(() => {
    // Suscribirse a cambios de estado
    const unsubscribe = voiceService.subscribe(setState)

    // Cleanup: desuscribirse cuando el componente se desmonta
    return unsubscribe
  }, [])

  return {
    // Estado
    connected: state.connected,
    peers: state.peers,
    audioEnabled: state.audioEnabled,
    videoEnabled: state.videoEnabled,

    // Acciones
    connect: (channelId: string, userId: string) => voiceService.connect(channelId, userId),
    disconnect: () => voiceService.disconnect(),
    toggleAudio: () => voiceService.toggleAudio(),
    toggleVideo: () => voiceService.toggleVideo(),
    getLocalStream: () => voiceService.getLocalStream(),

    // Gestión de dispositivos
    enumerateDevices: () => voiceService.enumerateDevices(),
    switchInputDevice: (deviceId: string) => voiceService.switchInputDevice(deviceId),
    switchOutputDevice: (deviceId: string) => voiceService.switchOutputDevice(deviceId),
    switchVideoInputDevice: (deviceId: string) => voiceService.switchVideoInputDevice(deviceId),
    getSelectedDevices: () => voiceService.getSelectedDevices(),
    setDevicePreferences: (input: string | null, output: string | null) =>
      voiceService.setDevicePreferences(input, output),
  }
}
