import type { ChatWebSocket, WebSocketMessage } from '../types'
import { activeConnections } from '../state'
import { sendResponse, sendError, broadcastToChannel, broadcastToDM } from '../utils'
import { db } from '../../../db/sql/drizzle'
import { channels, members, directConversations, users } from '../../../db/sql/schema'
import { eq, and } from 'drizzle-orm'
import { createChannelMessage, createDirectMessage } from '../../../db/nosql/messages'

const MAX_MESSAGE_LENGTH = 4000

function validateContent(content: unknown): string {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Contenido requerido')
  }
  const trimmed = content.trim()
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres`)
  }
  return trimmed
}

// Enviar mensaje a un canal
export async function handleSendChannelMessage(ws: ChatWebSocket, msg: WebSocketMessage) {
  try {
    const { channelId, content: rawContent } = msg.data ?? {}
    const connection = activeConnections.get(ws)

    if (!connection?.userId) {
      throw new Error('No autenticado')
    }

    const parsedChannelId = Number(channelId)
    if (!Number.isFinite(parsedChannelId)) {
      throw new Error('ID de canal inválido')
    }

    const content = validateContent(rawContent)

    // Verificar que el canal existe
    const channel = await db.select().from(channels).where(eq(channels.id, parsedChannelId)).get()
    if (!channel) {
      throw new Error('Canal no encontrado')
    }

    // Verificar membresía
    const member = await db
      .select()
      .from(members)
      .where(and(eq(members.serverId, channel.serverId), eq(members.userId, connection.userId)))
      .get()

    if (!member) {
      throw new Error('No eres miembro de este servidor')
    }

    // Crear mensaje en MongoDB
    const created = await createChannelMessage(parsedChannelId, connection.userId, content)

    // Obtener información del autor
    const author = await db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, connection.userId))
      .get()

    const messageWithAuthor = {
      ...created,
      author: author?.name ?? author?.email ?? 'Usuario',
      authorAvatarUrl: author?.avatarUrl ?? null,
    }

    // Broadcast a todos los suscritos al canal
    broadcastToChannel(parsedChannelId, {
      type: 'channel-message',
      data: { message: messageWithAuthor },
    })

    sendResponse(ws, msg.id!, { success: true, message: messageWithAuthor })

    console.log(`Mensaje enviado al canal ${parsedChannelId} por usuario ${connection.userId}`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error enviando mensaje')
  }
}

// Enviar mensaje directo
export async function handleSendDirectMessage(ws: ChatWebSocket, msg: WebSocketMessage) {
  try {
    const { conversationId, content: rawContent } = msg.data ?? {}
    const connection = activeConnections.get(ws)

    if (!connection?.userId) {
      throw new Error('No autenticado')
    }

    const parsedConversationId = Number(conversationId)
    if (!Number.isFinite(parsedConversationId)) {
      throw new Error('ID de conversación inválido')
    }

    const content = validateContent(rawContent)

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

    // Crear mensaje en MongoDB
    const created = await createDirectMessage(parsedConversationId, connection.userId, content)

    // Obtener información del autor
    const author = await db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, connection.userId))
      .get()

    const messageWithAuthor = {
      ...created,
      author: author?.name ?? author?.email ?? 'Usuario',
      authorAvatarUrl: author?.avatarUrl ?? null,
    }

    // Broadcast a todos los suscritos a la conversación
    broadcastToDM(parsedConversationId, {
      type: 'dm-message',
      data: { message: messageWithAuthor },
    })

    sendResponse(ws, msg.id!, { success: true, message: messageWithAuthor })

    console.log(`Mensaje directo enviado a conversación ${parsedConversationId} por usuario ${connection.userId}`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error enviando mensaje directo')
  }
}
