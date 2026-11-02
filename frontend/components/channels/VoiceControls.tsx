import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useVoice } from '../../lib/useVoice'
import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon, SubtitlesIcon, SubtitlesOffIcon } from '../common/Icons'

interface VoiceControlsProps {
  channelId: string
  userId: string
  members?: Array<{ id: number; name: string | null; email?: string }>
  transcriptionEnabled?: boolean
  onToggleTranscription?: () => void
}

export function VoiceControls({
  channelId,
  userId,
  members = [],
  transcriptionEnabled = false,
  onToggleTranscription,
}: VoiceControlsProps) {
  const { connected, audioEnabled, videoEnabled, peers, connect, disconnect, toggleAudio, toggleVideo } =
    useVoice()

  const [error, setError] = React.useState<string | null>(null)
  const [isConnecting, setIsConnecting] = React.useState(false)

  const handleConnect = async () => {
    console.log('Botón conectar presionado', { channelId, userId, connected })

    try {
      setError(null)
      setIsConnecting(true)

      if (connected) {
        await disconnect()
      } else {
        await connect(channelId, userId)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error de conexión')
      alert('Error: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setIsConnecting(false)
    }
  }

  const handleToggleAudio = async () => {
    try {
      await toggleAudio()
    } catch (error) {
      console.error('Error toggling audio:', error)
      setError(error instanceof Error ? error.message : 'Error al mutear/desmutear')
    }
  }

  const handleToggleVideo = async () => {
    try {
      await toggleVideo()
    } catch (error) {
      console.error('Error toggling video:', error)
      setError(error instanceof Error ? error.message : 'Error al activar/desactivar video')
    }
  }

  return (
    <View className="bg-dark-bg-elevated backdrop-blur-xl p-4 rounded-2xl border border-dark-border-default shadow-2xl">
      {/* Error message */}
      {error && (
        <View className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <Text className="text-red-400 text-sm">
            {error}
          </Text>
        </View>
      )}

      <View className="flex-row gap-3 items-center justify-center">
        {/* Botón Mutear/Desmutear */}
        {connected && (
          <TouchableOpacity
            className={`w-14 h-14 rounded-full items-center justify-center ${
              audioEnabled ? 'bg-dark-bg-hover' : 'bg-red-500/80'
            }`}
            onPress={handleToggleAudio}
          >
            {audioEnabled ? (
              <MicIcon size={24} color="#e8e8ed" />
            ) : (
              <MicOffIcon size={24} color="#fff" />
            )}
          </TouchableOpacity>
        )}

        {/* Botón Conectar/Desconectar */}
        <TouchableOpacity
          className={`px-6 py-3 rounded-full ${
            isConnecting ? 'bg-dark-bg-hover' : connected ? 'bg-red-600' : 'bg-green-600'
          }`}
          onPress={handleConnect}
          disabled={isConnecting}
        >
          <Text className="text-white text-center font-semibold">
            {isConnecting ? 'Conectando...' : connected ? 'Desconectar' : 'Conectar'}
          </Text>
        </TouchableOpacity>

        {/* Botón Video On/Off */}
        {connected && (
          <TouchableOpacity
            className={`w-14 h-14 rounded-full items-center justify-center ${
              videoEnabled ? 'bg-dark-bg-hover' : 'bg-red-500/80'
            }`}
            onPress={handleToggleVideo}
          >
            {videoEnabled ? (
              <VideoIcon size={24} color="#e8e8ed" />
            ) : (
              <VideoOffIcon size={24} color="#fff" />
            )}
          </TouchableOpacity>
        )}

        {/* Botón Transcripción On/Off */}
        {connected && onToggleTranscription && (
          <TouchableOpacity
            className={`w-14 h-14 rounded-full items-center justify-center ${
              transcriptionEnabled ? 'bg-dark-accent-purple' : 'bg-dark-bg-hover'
            }`}
            onPress={onToggleTranscription}
          >
            {transcriptionEnabled ? (
              <SubtitlesIcon size={24} color="#fff" />
            ) : (
              <SubtitlesOffIcon size={24} color="#e8e8ed" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Contador de participantes */}
      {connected && (
        <Text className="text-center text-dark-text-tertiary text-sm mt-3">
          {peers.size} {peers.size === 1 ? 'participante' : 'participantes'}
        </Text>
      )}
    </View>
  )
}
