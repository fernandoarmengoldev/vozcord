import type { ChatWebSocket, WebSocketMessage } from './types'
import { channelSubscriptions, dmSubscriptions } from './state'

// Enviar respuesta exitosa
export function sendResponse(ws: ChatWebSocket, id: string, data: any) {
  const response: WebSocketMessage = {
    id,
    type: 'response',
    data,
  }

  ws.send(JSON.stringify(response))
}

// Enviar error
export function sendError(ws: ChatWebSocket, id: string | undefined, error: string) {
  const response: WebSocketMessage = {
    id,
    type: 'error',
    error,
  }

  ws.send(JSON.stringify(response))
}

// Broadcast a todos los clientes suscritos a un canal
export function broadcastToChannel(channelId: number, message: WebSocketMessage) {
  const subscribers = channelSubscriptions.get(channelId)
  if (!subscribers) return

  const messageStr = JSON.stringify(message)

  for (const ws of subscribers) {
    ws.send(messageStr)
  }
}

// Broadcast a todos los clientes suscritos a una conversación
export function broadcastToDM(conversationId: number, message: WebSocketMessage) {
  const subscribers = dmSubscriptions.get(conversationId)
  if (!subscribers) return

  const messageStr = JSON.stringify(message)

  for (const ws of subscribers) {
    ws.send(messageStr)
  }
}
