import type { VoiceWebSocket, WebSocketMessage } from './types'
import { activeConnections, unsubscribeFromServer } from './state'
import { sendError } from './utils'
import { handleGetRtpCapabilities, handleJoinRoom, handleLeaveRoom, handleGetPeers, handleDisconnect } from './handlers/room'
import { handleCreateTransport, handleConnectTransport } from './handlers/transport'
import { handleProduce, handleConsume, handlePauseProducer, handleResumeProducer } from './handlers/media'
import { handleTranscribe, handleTranscriptionStatus } from './handlers/transcription'
import { handleAuthenticate, handleSubscribeToServer } from './handlers/auth'

// Manejar mensaje según su tipo
async function handleMessage(ws: VoiceWebSocket, msg: WebSocketMessage) {
  // El único mensaje permitido sin autenticar es 'authenticate'
  if (msg.type === 'authenticate') {
    await handleAuthenticate(ws, msg)
    return
  }

  if (!activeConnections.get(ws)?.authUserId) {
    sendError(ws, msg.id, 'No autenticado')
    return
  }

  switch (msg.type) {
    case 'get-rtp-capabilities':
      await handleGetRtpCapabilities(ws, msg)
      break

    case 'join-room':
      await handleJoinRoom(ws, msg)
      break

    case 'create-transport':
      await handleCreateTransport(ws, msg)
      break

    case 'connect-transport':
      await handleConnectTransport(ws, msg)
      break

    case 'produce':
      await handleProduce(ws, msg)
      break

    case 'consume':
      await handleConsume(ws, msg)
      break

    case 'pause-producer':
      await handlePauseProducer(ws, msg)
      break

    case 'resume-producer':
      await handleResumeProducer(ws, msg)
      break

    case 'leave-room':
      await handleLeaveRoom(ws, msg)
      break

    case 'subscribe-to-server':
      await handleSubscribeToServer(ws, msg)
      break

    case 'get-peers':
      await handleGetPeers(ws, msg)
      break

    case 'transcribe':
      await handleTranscribe(ws, msg)
      break

    case 'transcription-status':
      await handleTranscriptionStatus(ws, msg)
      break

    default:
      console.warn('ws_mediasoup - Tipo de mensaje desconocido:', msg.type)
      sendError(ws, msg.id, `Tipo de mensaje desconocido: ${msg.type}`)
  }
}

// Handler principal de WebSocket
export const voiceWebSocketHandler = {
  // Se ejecuta cuando un cliente se conecta
  open(ws: VoiceWebSocket) {
    console.log('ws_mediasoup - Cliente de voz conectado (WebSocket Nativo)')

    // Inicializar datos de conexión
    activeConnections.set(ws, {})
  },

  // Se ejecuta cuando se recibe un mensaje
  async message(ws: VoiceWebSocket, message: string | Buffer) {
    let msg: WebSocketMessage
    try {
      msg = JSON.parse(message.toString())
    } catch {
      sendError(ws, undefined, 'Mensaje JSON inválido')
      return
    }

    try {
      if (msg.type !== 'transcribe') {
        console.log('ws_mediasoup - Mensaje recibido:', msg.type)
      }
      await handleMessage(ws, msg)
    } catch (error) {
      console.error('ws_mediasoup - Error procesando mensaje:', error)
      sendError(ws, msg.id, error instanceof Error ? error.message : 'Error desconocido')
    }
  },

  // Se ejecuta cuando un cliente se desconecta
  close(ws: VoiceWebSocket) {
    console.log('ws_mediasoup - Cliente de voz desconectado')

    const connection = activeConnections.get(ws)
    if (connection?.channelId && connection?.peerId) {
      handleDisconnect(ws, connection.channelId, connection.peerId).catch((err) => {
        console.error('ws_mediasoup - Error limpiando peer desconectado:', err)
      })
    }

    // Antes el socket se quedaba para siempre en serverSubscriptions
    if (connection?.serverId !== undefined) {
      unsubscribeFromServer(ws, connection.serverId)
    }

    activeConnections.delete(ws)
  },

  // Se ejecuta cuando hay un error
  error(ws: VoiceWebSocket, error: Error) {
    console.error('ws_mediasoup - Error en WebSocket:', error)
  },
}

// Re-exportar función de stats
export { getActiveConnectionsStats } from './state'
