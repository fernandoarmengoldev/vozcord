import type { VoiceWebSocket, ConnectionData } from './types'

// Mapa de conexiones activas
export const activeConnections = new Map<VoiceWebSocket, ConnectionData>()

// Mapa de canales a WebSockets suscritos
export const channelSubscriptions = new Map<string, Set<VoiceWebSocket>>()

// Mapa de servidores a WebSockets suscritos (para eventos de presencia)
export const serverSubscriptions = new Map<number, Set<VoiceWebSocket>>()

// Suscribirse a un canal
export function subscribeToChannel(ws: VoiceWebSocket, channelId: string) {
  if (!channelSubscriptions.has(channelId)) {
    channelSubscriptions.set(channelId, new Set())
  }

  channelSubscriptions.get(channelId)!.add(ws)

  console.log(`ws_mediasoup - WebSocket suscrito al canal: ${channelId}`)
}

// Desuscribirse de un canal
export function unsubscribeFromChannel(ws: VoiceWebSocket, channelId: string) {
  const subscribers = channelSubscriptions.get(channelId)
  if (subscribers) {
    subscribers.delete(ws)

    if (subscribers.size === 0) {
      channelSubscriptions.delete(channelId)
    }
  }

  console.log(`ws_mediasoup - WebSocket desuscrito del canal: ${channelId}`)
}

// Suscribirse a eventos de presencia de un servidor
export function subscribeToServer(ws: VoiceWebSocket, serverId: number) {
  if (!serverSubscriptions.has(serverId)) {
    serverSubscriptions.set(serverId, new Set())
  }

  serverSubscriptions.get(serverId)!.add(ws)

  console.log(`ws_mediasoup - WebSocket suscrito a presencia del servidor: ${serverId}`)
}

// Desuscribirse de eventos de presencia de un servidor
export function unsubscribeFromServer(ws: VoiceWebSocket, serverId: number) {
  const subscribers = serverSubscriptions.get(serverId)
  if (subscribers) {
    subscribers.delete(ws)

    if (subscribers.size === 0) {
      serverSubscriptions.delete(serverId)
    }
  }

  console.log(`ws_mediasoup - WebSocket desuscrito de presencia del servidor: ${serverId}`)
}

// Obtener estadísticas de conexiones activas
export function getActiveConnectionsStats() {
  return {
    totalConnections: activeConnections.size,
    connections: Array.from(activeConnections.values()).map((conn) => ({
      channelId: conn.channelId,
      peerId: conn.peerId,
      userId: conn.userId,
    })),
  }
}
