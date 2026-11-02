import type { ChatWebSocket, WebSocketMessage } from '../types'
import { activeConnections, subscribeToChannel, unsubscribeFromChannel } from '../state'
import { sendResponse, sendError } from '../utils'
import { db } from '../../../db/sql/drizzle'
import { channels, members } from '../../../db/sql/schema'
import { eq, and } from 'drizzle-orm'

// Suscribirse a un canal
export async function handleSubscribeChannel(ws: ChatWebSocket, msg: WebSocketMessage) {
  try {
    const { channelId } = msg.data ?? {}
    const connection = activeConnections.get(ws)

    if (!connection?.userId) {
      throw new Error('No autenticado')
    }

    const parsedChannelId = Number(channelId)
    if (!Number.isFinite(parsedChannelId)) {
      throw new Error('ID de canal inválido')
    }

    // Verificar que el canal existe
    const channel = await db.select().from(channels).where(eq(channels.id, parsedChannelId)).get()
    if (!channel) {
      throw new Error('Canal no encontrado')
    }

    // Verificar membresía del servidor
    const member = await db
      .select()
      .from(members)
      .where(and(eq(members.serverId, channel.serverId), eq(members.userId, connection.userId)))
      .get()

    if (!member) {
      throw new Error('No eres miembro de este servidor')
    }

    // Suscribir al canal
    subscribeToChannel(ws, parsedChannelId)
    connection.channelSubscriptions.add(parsedChannelId)

    sendResponse(ws, msg.id!, { success: true, channelId: parsedChannelId })

    console.log(`ws_chat - Usuario ${connection.userId} suscrito al canal ${parsedChannelId}`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error suscribiéndose al canal')
  }
}

// Desuscribirse de un canal
export async function handleUnsubscribeChannel(ws: ChatWebSocket, msg: WebSocketMessage) {
  try {
    const { channelId } = msg.data ?? {}
    const connection = activeConnections.get(ws)

    if (!connection?.userId) {
      throw new Error('No autenticado')
    }

    const parsedChannelId = Number(channelId)
    if (!Number.isFinite(parsedChannelId)) {
      throw new Error('ID de canal inválido')
    }

    unsubscribeFromChannel(ws, parsedChannelId)
    connection.channelSubscriptions.delete(parsedChannelId)

    sendResponse(ws, msg.id!, { success: true })

    console.log(`ws_chat - Usuario ${connection.userId} desuscrito del canal ${parsedChannelId}`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error desuscribiéndose del canal')
  }
}
