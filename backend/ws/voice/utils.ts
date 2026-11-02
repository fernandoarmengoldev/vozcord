import type { VoiceWebSocket, WebSocketMessage } from './types'
import { channelSubscriptions, serverSubscriptions } from './state'

// Enviar respuesta exitosa
export function sendResponse(ws: VoiceWebSocket, id: string, data: any) {
  const response: WebSocketMessage = {
    id,
    type: 'response',
    data,
  }

  ws.send(JSON.stringify(response))
}

// Enviar error
export function sendError(ws: VoiceWebSocket, id: string | undefined, error: string) {
  const response: WebSocketMessage = {
    id,
    type: 'error',
    error,
  }

  ws.send(JSON.stringify(response))
}

// Broadcast a todos los clientes en un canal
export function broadcast(channelId: string, message: WebSocketMessage, exclude?: VoiceWebSocket) {
  const subscribers = channelSubscriptions.get(channelId)
  if (!subscribers) return

  const messageStr = JSON.stringify(message)

  for (const ws of subscribers) {
    if (ws !== exclude) {
      ws.send(messageStr)
    }
  }
}

// Broadcast de eventos de presencia a todos los clientes suscritos a un servidor
export function broadcastPresence(serverId: number, message: WebSocketMessage, exclude?: VoiceWebSocket) {
  const subscribers = serverSubscriptions.get(serverId)
  if (!subscribers) return

  const messageStr = JSON.stringify(message)

  for (const ws of subscribers) {
    if (ws !== exclude) {
      ws.send(messageStr)
    }
  }
}

// Eventos de entrada/salida de una sala: a los suscritos a la presencia del servidor
// y a los propios miembros de la sala (aunque estén viendo otro servidor), sin duplicados.
export function broadcastPresenceAndRoom(serverId: number, channelId: string, message: WebSocketMessage, exclude?: VoiceWebSocket) {
  const targets = new Set<VoiceWebSocket>([
    ...(serverSubscriptions.get(serverId) ?? []),
    ...(channelSubscriptions.get(channelId) ?? []),
  ])
  if (exclude) targets.delete(exclude)

  const messageStr = JSON.stringify(message)
  for (const ws of targets) {
    ws.send(messageStr)
  }
}
