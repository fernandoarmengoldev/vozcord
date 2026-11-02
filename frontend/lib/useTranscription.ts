import { useEffect, useState, useRef, useCallback } from 'react'
import { getVoiceWebSocketClient } from './mediasoup/voiceWebSocket'

export interface TranscriptionEntry {
  userId: string
  peerId: string
  text: string
  timestamp: Date
  isFinal: boolean
}

interface UseTranscriptionOptions {
  enabled: boolean
  peers: Map<string, any>
  language?: string
}

const IS_BROWSER = typeof window !== 'undefined'

// Convertir Float32Array a base64
function float32ToBase64(float32Array: Float32Array): string {
  const bytes = new Uint8Array(float32Array.buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

/**
 * Hook para transcribir audio de peers en tiempo real usando Whisper (Backend)
 */
export function useTranscription({ enabled, peers, language = 'es' }: UseTranscriptionOptions) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([])
  const [isModelReady, setIsModelReady] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)

  const audioContextsRef = useRef<Map<string, AudioContext>>(new Map())
  const processorsRef = useRef<Map<string, ScriptProcessorNode>>(new Map())
  const isProcessingRef = useRef(false)
  const isModelReadyRef = useRef(false)
  const enabledRef = useRef(false)

  // Mantener refs sincronizados
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useEffect(() => {
    isModelReadyRef.current = isModelReady
    console.log(`[Transcription] isModelReady changed to: ${isModelReady}`)
  }, [isModelReady])

  // Verificar estado del modelo en el backend
  useEffect(() => {
    console.log('[Transcription] useEffect para verificar modelo, enabled:', enabled)
    if (!IS_BROWSER || !enabled) {
      console.log('[Transcription] Saltando verificación - IS_BROWSER:', IS_BROWSER, 'enabled:', enabled)
      return
    }

    let cancelled = false
    let checkInterval: ReturnType<typeof setInterval>

    const checkModelStatus = async () => {
      console.log('[Transcription] Verificando estado del modelo...')
      try {
        const wsClient = getVoiceWebSocketClient()
        console.log('[Transcription] WebSocket conectado:', wsClient.isConnected())
        if (!wsClient.isConnected()) {
          console.log('[Transcription] WebSocket no conectado, esperando...')
          return
        }

        const status = await wsClient.request('transcription-status')
        console.log('[Transcription] Estado del modelo:', status)
        if (!cancelled) {
          setIsModelReady(status.modelLoaded)
          isModelReadyRef.current = status.modelLoaded
          if (status.modelLoading) {
            setLoadingProgress(50)
          } else if (status.modelLoaded) {
            setLoadingProgress(100)
          }
        }
      } catch (error) {
        console.log('[Transcription] Error verificando estado:', error)
      }
    }

    // Verificar estado inicial y periódicamente hasta que esté listo
    checkModelStatus()
    checkInterval = setInterval(() => {
      if (!isModelReadyRef.current) {
        checkModelStatus()
      }
    }, 2000)

    return () => {
      cancelled = true
      clearInterval(checkInterval)
    }
  }, [enabled])

  // Escuchar transcripciones de otros peers
  useEffect(() => {
    if (!IS_BROWSER || !enabled) return

    const wsClient = getVoiceWebSocketClient()

    const handleTranscription = (data: any) => {
      if (data.text && data.text.trim().length > 0) {
        setTranscriptions(prev => {
          // Evitar duplicados recientes
          const last = prev[prev.length - 1]
          if (last && last.text === data.text && last.peerId === data.peerId &&
              (Date.now() - last.timestamp.getTime() < 2000)) {
            return prev
          }

          return [...prev, {
            userId: data.userId || data.peerId,
            peerId: data.peerId,
            text: data.text.trim(),
            timestamp: new Date(data.timestamp || Date.now()),
            isFinal: true
          }].slice(-50)
        })
      }
    }

    wsClient.on('transcription', handleTranscription)

    return () => {
      wsClient.off('transcription', handleTranscription)
    }
  }, [enabled])

  // Función para enviar audio al backend
  const sendAudioForTranscription = useCallback(async (audioData: Float32Array, peerId: string) => {
    if (!isModelReadyRef.current || isProcessingRef.current) return

    isProcessingRef.current = true

    try {
      const wsClient = getVoiceWebSocketClient()
      if (!wsClient.isConnected()) {
        isProcessingRef.current = false
        return
      }

      const audioBase64 = float32ToBase64(audioData)

      const result = await wsClient.request('transcribe', {
        audio: audioBase64,
        language: (language.split('-')[0] ?? 'es').toLowerCase(),
        peerId,
      })

      if (result.text && result.text.trim().length > 0) {
        console.log(`[Transcription] ${peerId}: "${result.text}"`)

        setTranscriptions(prev => {
          const userId = peerId === 'local' ? 'local' : peers.get(peerId)?.userId || peerId

          // Evitar duplicados recientes
          const last = prev[prev.length - 1]
          if (last && last.text === result.text && last.peerId === peerId &&
              (Date.now() - last.timestamp.getTime() < 2000)) {
            return prev
          }

          return [...prev, {
            userId,
            peerId,
            text: result.text.trim(),
            timestamp: new Date(result.timestamp || Date.now()),
            isFinal: true
          }].slice(-50)
        })
      }
    } catch (error) {
      console.error('[Transcription] Error:', error)
    } finally {
      isProcessingRef.current = false
    }
  }, [language, peers])

  // Función para procesar audio stream
  const processAudioStream = useCallback((peerId: string, stream: MediaStream) => {
    if (!enabled || !IS_BROWSER) return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      })

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)

      source.connect(processor)
      processor.connect(audioContext.destination)

      // VAD inteligente - junta solo audio con voz, envía cuando hay suficiente
      const VOICE_THRESHOLD = 0.015 // Umbral para detectar voz
      const MIN_AUDIO_DURATION = 16000 * 10 // Mínimo 10 segundos de audio con voz
      const MAX_AUDIO_DURATION = 16000 * 30 // Máximo 30 segundos
      const SILENCE_TO_SEND = 20 // ~2 segundos de silencio para enviar

      let voiceBuffer: number[] = [] // Solo guarda audio con voz
      let consecutiveSilence = 0
      let hasVoiceContent = false
      let logCounter = 0

      processor.onaudioprocess = (e) => {
        if (!enabledRef.current || !isModelReadyRef.current) {
          if (logCounter++ % 50 === 0) {
            console.log('[VAD] Procesador pausado - enabled:', enabledRef.current, 'modelReady:', isModelReadyRef.current)
          }
          return
        }

        const inputData = e.inputBuffer.getChannelData(0)

        // Calcular energía del chunk
        let energy = 0
        for (let i = 0; i < inputData.length; i++) {
          energy += inputData[i]! * inputData[i]!
        }
        energy = Math.sqrt(energy / inputData.length)

        const hasVoice = energy > VOICE_THRESHOLD

        // Log cada 50 chunks (~0.5 segundos)
        if (logCounter++ % 50 === 0) {
          console.log(`[VAD] Energia: ${energy.toFixed(6)}, Umbral: ${VOICE_THRESHOLD}, Buffer: ${voiceBuffer.length} samples (${(voiceBuffer.length / 16000).toFixed(1)}s)`)
        }

        if (hasVoice) {
          // Guardar chunk con voz
          for (let i = 0; i < inputData.length; i++) {
            voiceBuffer.push(inputData[i]!)
          }
          consecutiveSilence = 0
          hasVoiceContent = true
        } else if (hasVoiceContent) {
          // Estamos en silencio pero ya teníamos voz
          consecutiveSilence++

          // Añadir un poco de silencio para contexto (máx 0.5s)
          if (consecutiveSilence <= 5) {
            for (let i = 0; i < inputData.length; i++) {
              voiceBuffer.push(inputData[i]!)
            }
          }
        }

        // Condiciones para enviar:
        // 1. Tenemos mínimo 10s de audio con voz
        // 2. Detectamos silencio largo (2s) O el buffer está lleno (30s)
        const hasEnoughAudio = voiceBuffer.length >= MIN_AUDIO_DURATION
        const longSilence = consecutiveSilence >= SILENCE_TO_SEND
        const bufferFull = voiceBuffer.length >= MAX_AUDIO_DURATION

        if (hasVoiceContent && hasEnoughAudio && (longSilence || bufferFull)) {
          const duration = (voiceBuffer.length / 16000).toFixed(1)
          console.log(`[VAD] Enviando ${duration}s de audio con voz (silencio: ${longSilence}, lleno: ${bufferFull})`)

          const dataToSend = new Float32Array(voiceBuffer)
          sendAudioForTranscription(dataToSend, peerId)

          // Reset
          voiceBuffer = []
          consecutiveSilence = 0
          hasVoiceContent = false
        }

        // Si hay demasiado silencio sin haber acumulado suficiente audio, descartar
        if (consecutiveSilence > 50 && voiceBuffer.length < MIN_AUDIO_DURATION) {
          voiceBuffer = []
          hasVoiceContent = false
          consecutiveSilence = 0
        }
      }

      audioContextsRef.current.set(peerId, audioContext)
      processorsRef.current.set(peerId, processor)

      console.log(`[Transcription] Procesando audio de peer: ${peerId}`)
    } catch (error) {
      console.error('[Transcription] Error configurando audio:', peerId, error)
    }
  }, [enabled, sendAudioForTranscription])

  // Gestionar peers
  useEffect(() => {
    if (!enabled) {
      audioContextsRef.current.forEach(ctx => ctx.close())
      audioContextsRef.current.clear()
      processorsRef.current.forEach(proc => proc.disconnect())
      processorsRef.current.clear()
      return
    }

    peers.forEach((peer, peerId) => {
      if (audioContextsRef.current.has(peerId)) return

      if (peer.audioStream) {
        processAudioStream(peerId, peer.audioStream)
      }
    })

    audioContextsRef.current.forEach((_, peerId) => {
      if (!peers.has(peerId)) {
        const ctx = audioContextsRef.current.get(peerId)
        const proc = processorsRef.current.get(peerId)
        ctx?.close()
        proc?.disconnect()
        audioContextsRef.current.delete(peerId)
        processorsRef.current.delete(peerId)
      }
    })
  }, [enabled, peers, processAudioStream])

  useEffect(() => {
    return () => {
      audioContextsRef.current.forEach(ctx => ctx.close())
      processorsRef.current.forEach(proc => proc.disconnect())
    }
  }, [])

  const clearTranscriptions = useCallback(() => {
    setTranscriptions([])
  }, [])

  return {
    transcriptions,
    isSupported: IS_BROWSER,
    isModelReady,
    loadingProgress,
    clearTranscriptions,
  }
}
