// Servicio de transcripción usando Fireworks.ai API

const FIREWORKS_API_URL = 'https://audio-prod.api.fireworks.ai/v1/audio/transcriptions'
const FIREWORKS_MODEL = 'whisper-v3' // Modelo soportado por Fireworks.ai

/**
 * Convierte Float32Array (PCM 16kHz mono) a WAV buffer
 */
function float32ToWav(audioData: Float32Array, sampleRate: number = 16000): Buffer {
  const numChannels = 1
  const bitsPerSample = 16
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = audioData.length * bytesPerSample
  const headerSize = 44
  const totalSize = headerSize + dataSize

  const buffer = Buffer.alloc(totalSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(totalSize - 8, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // chunk size
  buffer.writeUInt16LE(1, 20) // audio format (PCM)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  // Write audio data (convert float32 to int16)
  let offset = 44
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i] ?? 0))
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    buffer.writeInt16LE(Math.round(intSample), offset)
    offset += 2
  }

  return buffer
}

/**
 * Transcribe audio usando Fireworks.ai API
 * @param audioData - Float32Array con audio a 16kHz mono
 * @param language - Código de idioma (ej: 'es', 'en')
 */
export async function transcribeAudio(
  audioData: Float32Array,
  language: string = 'es'
): Promise<string> {
  const apiKey = process.env.FIREWORKS_API_KEY

  if (!apiKey) {
    console.error('[Transcription] ERROR: FIREWORKS_API_KEY no configurada en .env')
    throw new Error('API key not configured')
  }

  // Convertir a WAV
  const wavBuffer = float32ToWav(audioData, 16000)
  const lang = (language.split('-')[0] || 'es').toLowerCase()

  // Crear FormData
  const formData = new FormData()
  const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' })
  formData.append('file', audioBlob, 'audio.wav')
  formData.append('model', FIREWORKS_MODEL)
  formData.append('language', lang)
  formData.append('response_format', 'json')

  const response = await fetch(FIREWORKS_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Transcription] ERROR de API:', response.status)
    console.error('[Transcription] Error body:', errorText)
    throw new Error(`API error: ${response.status}`)
  }

  const result = await response.json() as { text?: string }
  const text = result.text?.trim() || ''

  // Filtrar alucinaciones comunes
  const hallucinations = [
    'gracias por ver',
    'suscríbete',
    'thank you for watching',
    'subscribe',
    'subtítulos',
  ]

  const textLower = text.toLowerCase()
  for (const h of hallucinations) {
    if (textLower.includes(h) && text.length < 50) {
      return ''
    }
  }

  return text
}

/**
 * Verifica si el servicio está disponible (siempre true con API externa)
 */
export function isModelLoaded(): boolean {
  return !!process.env.FIREWORKS_API_KEY
}

/**
 * No hay carga de modelo con API externa
 */
export function isModelLoading(): boolean {
  return false
}

/**
 * No necesita precargar nada con API externa
 */
export async function preloadModel(): Promise<void> {
  if (!process.env.FIREWORKS_API_KEY) {
    console.warn('[Transcription] FIREWORKS_API_KEY no configurada - transcripción deshabilitada')
  } else {
    console.log('[Transcription] Usando Fireworks.ai API para transcripción')
  }
}
