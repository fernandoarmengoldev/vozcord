import type { ChatWebSocket, WebSocketMessage } from './types'
import { activeConnections, unsubscribeFromChannel, unsubscribeFromDM } from './state'
import { sendError } from './utils'
import { handleAuthenticate } from './handlers/auth'
import { handleSubscribeChannel, handleUnsubscribeChannel } from './handlers/channels'
import { handleSubscribeDM, handleUnsubscribeDM } from './handlers/dms'
import { handleSendChannelMessage, handleSendDirectMessage } from './handlers/messages'

// Manejar mensaje según su tipo
async function handleMessage(ws: ChatWebSocket, msg: WebSocketMessage) {
  switch (msg.type) {
    case 'authenticate':
      await handleAuthenticate(ws, msg)
      break

    case 'subscribe-channel':
      await handleSubscribeChannel(ws, msg)
      break

    case 'unsubscribe-channel':
      await handleUnsubscribeChannel(ws, msg)
      break

    case 'subscribe-dm':
      await handleSubscribeDM(ws, msg)
      break

    case 'unsubscribe-dm':
      await handleUnsubscribeDM(ws, msg)
      break

    case 'send-channel-message':
      await handleSendChannelMessage(ws, msg)
      break

    case 'send-dm':
      await handleSendDirectMessage(ws, msg)
      break

    default:
      console.warn('ws_chat - Tipo de mensaje desconocido:', msg.type)
      sendError(ws, msg.id, `Tipo de mensaje desconocido: ${msg.type}`)
  }
}

// Handler principal de WebSocket para chat
export const chatWebSocketHandler = {
  // Se ejecuta cuando un cliente se conecta
  open(ws: ChatWebSocket) {
    console.log('ws_chat - Cliente de chat conectado (WebSocket Nativo)')

    // Inicializar datos de conexión
    activeConnections.set(ws, {
      channelSubscriptions: new Set(),
      dmSubscriptions: new Set(),
    })
  },

  // Se ejecuta cuando se recibe un mensaje
  async message(ws: ChatWebSocket, message: string | Buffer) {
    try {
      const msg: WebSocketMessage = JSON.parse(message.toString())

      console.log('ws_chat - Mensaje de chat recibido:', msg.type)

      await handleMessage(ws, msg)
    } catch (error) {
      console.error('ws_chat - Error procesando mensaje de chat:', error)

      sendError(ws, undefined, error instanceof Error ? error.message : 'Error desconocido')
    }
  },

  // Se ejecuta cuando un cliente se desconecta
  close(ws: ChatWebSocket) {
    console.log('ws_chat - Cliente de chat desconectado')

    const connection = activeConnections.get(ws)
    if (connection) {
      // Desuscribir de todos los canales
      for (const channelId of connection.channelSubscriptions) {
        unsubscribeFromChannel(ws, channelId)
      }

      // Desuscribir de todas las conversaciones
      for (const conversationId of connection.dmSubscriptions) {
        unsubscribeFromDM(ws, conversationId)
      }
    }

    activeConnections.delete(ws)
  },

  // Se ejecuta cuando hay un error
  error(ws: ChatWebSocket, error: Error) {
    console.error('ws_chat - Error en WebSocket de chat:', error)
  },
}

// Re-exportar función de stats
export { getChatConnectionsStats } from './state'
