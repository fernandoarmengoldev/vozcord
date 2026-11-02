import type { VoiceWebSocket, WebSocketMessage } from '../types'
import { activeConnections, subscribeToServer, unsubscribeFromServer } from '../state'
import { sendResponse, sendError } from '../utils'
import { verifyJWT } from '../../../routes/auth'
import { roomManager } from '../../../mediasoup/rooms'
import { db } from '../../../db/sql/drizzle'
import { channels, members } from '../../../db/sql/schema'
import { and, eq } from 'drizzle-orm'

// Autenticar la conexión con el JWT (mismo mecanismo que el WebSocket de chat)
export async function handleAuthenticate(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const token = msg.data?.token
    if (!token || typeof token !== 'string') {
      throw new Error('Token no proporcionado')
    }

    const payload = await verifyJWT(token)
    const userId = Number(payload?.sub)
    if (!payload || !Number.isFinite(userId)) {
      throw new Error('Token inválido')
    }

    const connection = activeConnections.get(ws)
    if (connection) {
      connection.authUserId = userId
    }

    sendResponse(ws, msg.id!, { success: true, userId })
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error de autenticación')
  }
}

// Comprobar que el usuario es miembro del servidor
export async function isServerMember(serverId: number, userId: number): Promise<boolean> {
  const member = await db
    .select({ serverId: members.serverId })
    .from(members)
    .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
    .get()
  return !!member
}

// Suscribirse a los eventos de presencia de un servidor.
// Solo se mantiene una suscripción por conexión (la del servidor que se está viendo)
// y se devuelve el estado actual de los canales de voz para pintar la presencia inicial.
export async function handleSubscribeToServer(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const serverId = Number(msg.data?.serverId)
    if (!Number.isFinite(serverId)) {
      throw new Error('Invalid serverId')
    }

    const connection = activeConnections.get(ws)
    if (!connection?.authUserId) {
      throw new Error('No autenticado')
    }

    if (!(await isServerMember(serverId, connection.authUserId))) {
      throw new Error('No eres miembro de este servidor')
    }

    if (connection.serverId !== undefined && connection.serverId !== serverId) {
      unsubscribeFromServer(ws, connection.serverId)
    }
    connection.serverId = serverId
    subscribeToServer(ws, serverId)

    // Estado actual de las rooms de voz de este servidor
    const activeRooms = roomManager.getActiveRooms()
    let presence: { channelId: string; peers: { userId: string; peerId: string }[] }[] = []
    if (activeRooms.length > 0) {
      const serverChannels = await db
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.serverId, serverId))
        .all()
      const channelIds = new Set(serverChannels.map((c) => String(c.id)))
      presence = activeRooms.filter((room) => channelIds.has(room.channelId))
    }

    sendResponse(ws, msg.id!, { success: true, presence })
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error subscribing to server')
  }
}
