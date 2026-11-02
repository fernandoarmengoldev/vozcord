import React, { useEffect, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import type { TranscriptionEntry } from '../../lib/useTranscription'

interface TranscriptionPanelProps {
  transcriptions: TranscriptionEntry[]
  members?: Array<{ id: number; name: string | null; email?: string }>
  onClear?: () => void
  isSupported: boolean
  isModelReady?: boolean
  loadingProgress?: number
}

/**
 * Panel lateral para mostrar transcripciones en tiempo real
 */
export function TranscriptionPanel({
  transcriptions,
  members = [],
  onClear,
  isSupported,
  isModelReady = false,
  loadingProgress = 0,
}: TranscriptionPanelProps) {
  const scrollViewRef = useRef<ScrollView>(null)

  // Auto-scroll al final cuando se añaden nuevas transcripciones
  useEffect(() => {
    if (transcriptions.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }
  }, [transcriptions])

  // Función para obtener el nombre de usuario
  const getUserName = (userId: string) => {
    if (userId === 'local') return 'Tú'

    const member = members.find((m) => m.id.toString() === userId)
    return member?.name || member?.email || `Usuario ${userId}`
  }

  // Formatear timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <View className="bg-dark-bg-secondary backdrop-blur-xl rounded-2xl border border-dark-border-subtle shadow-2xl flex-1">
      {/* Header */}
      <View className="border-b border-dark-border-default p-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-dark-text-primary text-lg font-semibold">Transcripciones</Text>
            <Text className="text-dark-text-tertiary text-xs mt-1">
              {!isSupported
                ? 'No soportado en este navegador'
                : !isModelReady
                  ? `Cargando modelo... ${Math.round(loadingProgress)}%`
                  : 'En tiempo real'}
            </Text>
          </View>

          {onClear && transcriptions.length > 0 && (
            <TouchableOpacity
              onPress={onClear}
              className="bg-dark-bg-elevated border border-dark-border-default px-3 py-2 rounded-lg active:bg-dark-bg-hover"
            >
              <Text className="text-dark-text-primary text-xs">Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Advertencia si no está soportado */}
      {!isSupported && (
        <View className="m-4 bg-dark-accent-purple/10 border border-dark-accent-purple/30 rounded-lg p-3">
          <Text className="text-dark-accent-purple-light text-sm">
            Whisper no está disponible en este navegador.
          </Text>
          <Text className="text-dark-text-tertiary text-xs mt-1">
            Usa Chrome o Edge para la transcripción en tiempo real.
          </Text>
        </View>
      )}

      {/* Indicador mientras carga el modelo en el servidor */}
      {isSupported && !isModelReady && (
        <View className="mx-4 mt-4">
          <View className="bg-dark-bg-elevated rounded-full h-2 overflow-hidden">
            <View
              className="bg-dark-accent-blue h-full rounded-full"
              style={{ width: `${loadingProgress}%` }}
            />
          </View>
          <Text className="text-dark-text-tertiary text-xs mt-2 text-center">
            {loadingProgress > 0 ? 'Cargando modelo en servidor...' : 'Conectando...'}
          </Text>
        </View>
      )}

      {/* Lista de transcripciones */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {transcriptions.filter(entry => entry.isFinal).length === 0 ? (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-dark-text-tertiary text-center">
              {isSupported
                ? 'Las transcripciones aparecerán aquí...'
                : 'Transcripción no disponible'}
            </Text>
          </View>
        ) : (
          transcriptions
            .filter(entry => entry.isFinal)
            .map((entry, index) => (
              <View
                key={`${entry.peerId}-${index}`}
                className="mb-3"
              >
                {/* Header con nombre y tiempo */}
                <View className="flex-row items-center justify-between mb-1">
                  <View className="flex-row items-center">
                    {/* Indicador de usuario */}
                    <View
                      className={`w-2 h-2 rounded-full mr-2 ${entry.userId === 'local' ? 'bg-dark-accent-blue' : 'bg-dark-accent-purple'
                        }`}
                    />
                    <Text className="text-dark-text-secondary text-sm font-medium">
                      {getUserName(entry.userId)}
                    </Text>
                  </View>

                  <Text className="text-dark-text-tertiary text-xs">
                    {formatTime(entry.timestamp)}
                  </Text>
                </View>

                {/* Texto de la transcripción */}
                <View
                  className={`ml-4 pl-3 border-l-2 ${entry.userId === 'local' ? 'border-dark-accent-blue/30' : 'border-dark-accent-purple/30'
                    }`}
                >
                  <Text className="text-dark-text-primary text-sm">
                    {entry.text}
                  </Text>
                </View>
              </View>
            ))
        )}
      </ScrollView>

      {/* Footer con info */}
      {isSupported && transcriptions.length > 0 && (
        <View className="border-t border-dark-border-default p-3">
          <Text className="text-dark-text-tertiary text-xs text-center">
            {transcriptions.length} {transcriptions.length === 1 ? 'transcripción' : 'transcripciones'}
          </Text>
        </View>
      )}
    </View>
  )
}
