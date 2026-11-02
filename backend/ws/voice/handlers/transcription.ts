import type { VoiceWebSocket, WebSocketMessage } from '../types'
import { sendResponse, sendError, broadcast } from '../utils'
import { transcribeAudio, isModelLoaded, isModelLoading } from '../../../services/transcription'
import { requireRoom } from './room'
import { roomManager } from '../../../mediasoup/rooms'

// Máximo ~35 s de audio a 16 kHz en Float32 (4 bytes/muestra) en base64 (el cliente envía hasta ~30 s)
const MAX_AUDIO_BASE64_LENGTH = Math.ceil((16000 * 35 * 4 * 4) / 3)

/**
 * Maneja la transcripción de audio
 * El cliente envía audio en formato Float32Array (base64) y recibe el texto transcrito
 */
export async function handleTranscribe(ws: VoiceWebSocket, msg: WebSocketMessage) {
  const { audio, language = 'es', peerId: speakerPeerId } = msg.data || {}

  if (!audio || typeof audio !== 'string') {
    sendError(ws, msg.id, 'Audio data is required')
    return
  }

  if (audio.length > MAX_AUDIO_BASE64_LENGTH) {
    sendError(ws, msg.id, 'Audio demasiado largo')
    return
  }

  try {
    // Solo se puede transcribir estando en una sala de voz (la API externa cuesta dinero)
    const { channelId, peerId: ownPeerId } = requireRoom(ws)

    // El cliente transcribe el audio de los participantes remotos: el texto se atribuye
    // al hablante (peerId enviado), que debe estar en la misma sala. El userId sale del servidor.
    const peerId = typeof speakerPeerId === 'string' && speakerPeerId ? speakerPeerId : ownPeerId
    const speaker = roomManager.getPeer(channelId, peerId)
    if (!speaker) {
      throw new Error('El participante no está en tu sala')
    }
    const userId = speaker.userId

    // Convertir base64 a Float32Array
    const binaryString = atob(audio)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    if (bytes.byteLength % 4 !== 0) {
      throw new Error('Formato de audio inválido')
    }

    const audioData = new Float32Array(bytes.buffer)
    const text = await transcribeAudio(audioData, String(language))

    if (!text) {
      sendResponse(ws, msg.id!, { text: '', peerId })
      return
    }

    const responseData = {
      text,
      peerId,
      userId,
      timestamp: new Date().toISOString(),
    }

    // Enviar respuesta al cliente que solicitó
    sendResponse(ws, msg.id!, responseData)

    // Broadcast al resto del canal
    broadcast(channelId, {
      type: 'transcription',
      data: responseData,
    }, ws)
  } catch (error) {
    console.error('[Transcription Handler] Error:', error)
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Transcription error')
  }
}

/**
 * Verifica el estado del modelo de transcripción
 */
export async function handleTranscriptionStatus(ws: VoiceWebSocket, msg: WebSocketMessage) {
  sendResponse(ws, msg.id!, {
    modelLoaded: isModelLoaded(),
    modelLoading: isModelLoading(),
  })
}
