import type { ChatWebSocket, WebSocketMessage } from '../types'
import { activeConnections, subscribeToDM, unsubscribeFromDM } from '../state'
import { sendResponse, sendError } from '../utils'
import { db } from '../../../db/sql/drizzle'
import { directConversations } from '../../../db/sql/schema'
import { eq } from 'drizzle-orm'

// Suscribirse a una conversación directa
export async function handleSubscribeDM(ws: ChatWebSocket, msg: WebSocketMessage) {
  try {
    const { conversationId } = msg.data ?? {}
    const connection = activeConnections.get(ws)

    if (!connection?.userId) {
      throw new Error('No autenticado')
    }

    const parsedConversationId = Number(conversationId)
    if (!Number.isFinite(parsedConversationId)) {
      throw new Error('ID de conversación inválido')
    }

    // Verificar que la conversación existe y el usuario es participante
    const conversation = await db
      .select()
      .from(directConversations)
      .where(eq(directConversations.id, parsedConversationId))
      .get()

    if (!conversation) {
      throw new Error('Conversación no encontrada')
    }

    if (conversation.userAId !== connection.userId && conversation.userBId !== connection.userId) {
      throw new Error('No eres parte de esta conversación')
    }

    // Suscribir a la conversación
    subscribeToDM(ws, parsedConversationId)
    connection.dmSubscriptions.add(parsedConversationId)

    sendResponse(ws, msg.id!, { success: true, conversationId: parsedConversationId })

    console.log(`ws_chat - Usuario ${connection.userId} suscrito a conversación ${parsedConversationId}`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error suscribiéndose a la conversación')
  }
}

// Desuscribirse de una conversación directa
export async function handleUnsubscribeDM(ws: ChatWebSocket, msg: WebSocketMessage) {
  try {
    const { conversationId } = msg.data ?? {}
    const connection = activeConnections.get(ws)

    if (!connection?.userId) {
      throw new Error('No autenticado')
    }

    const parsedConversationId = Number(conversationId)
    if (!Number.isFinite(parsedConversationId)) {
      throw new Error('ID de conversación inválido')
    }

    unsubscribeFromDM(ws, parsedConversationId)
    connection.dmSubscriptions.delete(parsedConversationId)

    sendResponse(ws, msg.id!, { success: true })

    console.log(`ws_chat - Usuario ${connection.userId} desuscrito de conversación ${parsedConversationId}`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error desuscribiéndose de la conversación')
  }
}
