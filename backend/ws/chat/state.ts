import type { ChatWebSocket, ChatConnectionData } from './types'

// Mapa de conexiones activas
export const activeConnections = new Map<ChatWebSocket, ChatConnectionData>()

// Mapa de canales a WebSockets suscritos
export const channelSubscriptions = new Map<number, Set<ChatWebSocket>>()

// Mapa de conversaciones directas a WebSockets suscritos
export const dmSubscriptions = new Map<number, Set<ChatWebSocket>>()

// Suscribirse a un canal
export function subscribeToChannel(ws: ChatWebSocket, channelId: number) {
  if (!channelSubscriptions.has(channelId)) {
    channelSubscriptions.set(channelId, new Set())
  }

  channelSubscriptions.get(channelId)!.add(ws)

  console.log(`ws_chat - WebSocket suscrito al canal: ${channelId}`)
}

// Desuscribirse de un canal
export function unsubscribeFromChannel(ws: ChatWebSocket, channelId: number) {
  const subscribers = channelSubscriptions.get(channelId)
  if (subscribers) {
    subscribers.delete(ws)

    if (subscribers.size === 0) {
      channelSubscriptions.delete(channelId)
    }
  }

  console.log(`ws_chat - WebSocket desuscrito del canal: ${channelId}`)
}

// Suscribirse a una conversación directa
export function subscribeToDM(ws: ChatWebSocket, conversationId: number) {
  if (!dmSubscriptions.has(conversationId)) {
    dmSubscriptions.set(conversationId, new Set())
  }

  dmSubscriptions.get(conversationId)!.add(ws)

  console.log(`ws_chat - WebSocket suscrito a conversación: ${conversationId}`)
}

// Desuscribirse de una conversación directa
export function unsubscribeFromDM(ws: ChatWebSocket, conversationId: number) {
  const subscribers = dmSubscriptions.get(conversationId)
  if (subscribers) {
    subscribers.delete(ws)

    if (subscribers.size === 0) {
      dmSubscriptions.delete(conversationId)
    }
  }

  console.log(`ws_chat - WebSocket desuscrito de conversación: ${conversationId}`)
}

// Obtener estadísticas de conexiones activas
export function getChatConnectionsStats() {
  return {
    totalConnections: activeConnections.size,
    channelSubscriptions: channelSubscriptions.size,
    dmSubscriptions: dmSubscriptions.size,
  }
}
