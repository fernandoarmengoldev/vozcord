import { getMessagesCollection, getDirectMessagesCollection } from './mongodb'
import type { ChannelMessage, DirectMessage } from './schema'

// Mensajes de canales
export async function getChannelMessages(
  channelId: number,
  limit: number = 50,
  beforeCreatedAt?: string
) {
  try {
    const collection = await getMessagesCollection()

    // Validar y sanitizar inputs
    const sanitizedChannelId = Number(channelId)
    if (!Number.isFinite(sanitizedChannelId)) {
      throw new Error('Invalid channelId')
    }

    const sanitizedLimit = Math.min(Math.max(Number(limit), 1), 100)

    // Construir filtro
    const filter: any = { channelId: sanitizedChannelId }

    if (beforeCreatedAt) {
      const beforeDate = new Date(beforeCreatedAt)
      if (!isNaN(beforeDate.getTime())) {
        filter.createdAt = { $lt: beforeDate }
      }
    }

    // Consulta con índice optimizado (channelId + createdAt)
    const messages = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(sanitizedLimit)
      .toArray()

    // Convertir ObjectId a string y revertir orden para mostrar cronológicamente
    return messages.reverse().map(msg => ({
      id: msg._id.toString(),
      channelId: msg.channelId,
      userId: msg.userId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    }))
  } catch (error) {
    console.error('Error fetching channel messages:', error)
    throw error
  }
}

export async function createChannelMessage(
  channelId: number,
  userId: number,
  content: string
) {
  try {
    const collection = await getMessagesCollection()

    // Validar y sanitizar inputs
    const sanitizedChannelId = Number(channelId)
    const sanitizedUserId = Number(userId)

    if (!Number.isFinite(sanitizedChannelId)) {
      throw new Error('Invalid channelId')
    }
    if (!Number.isFinite(sanitizedUserId)) {
      throw new Error('Invalid userId')
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new Error('Invalid content')
    }

    const newMessage: ChannelMessage = {
      channelId: sanitizedChannelId,
      userId: sanitizedUserId,
      content: content.trim(),
      createdAt: new Date(),
    }

    const result = await collection.insertOne(newMessage)

    return {
      id: result.insertedId.toString(),
      channelId: newMessage.channelId,
      userId: newMessage.userId,
      content: newMessage.content,
      createdAt: newMessage.createdAt.toISOString(),
    }
  } catch (error) {
    console.error('Error creating channel message:', error)
    throw error
  }
}

// Mensajes directos
export async function getDirectMessagesForConversation(
  conversationId: number,
  limit: number = 50,
  beforeCreatedAt?: string
) {
  try {
    const collection = await getDirectMessagesCollection()

    // Validar y sanitizar inputs
    const sanitizedConversationId = Number(conversationId)
    if (!Number.isFinite(sanitizedConversationId)) {
      throw new Error('Invalid conversationId')
    }

    const sanitizedLimit = Math.min(Math.max(Number(limit), 1), 100)

    // Construir filtro
    const filter: any = { conversationId: sanitizedConversationId }

    if (beforeCreatedAt) {
      const beforeDate = new Date(beforeCreatedAt)
      if (!isNaN(beforeDate.getTime())) {
        filter.createdAt = { $lt: beforeDate }
      }
    }

    // Consulta con índice optimizado (conversationId + createdAt)
    const messages = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(sanitizedLimit)
      .toArray()

    // Convertir ObjectId a string y revertir orden
    return messages.reverse().map(msg => ({
      id: msg._id.toString(),
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    }))
  } catch (error) {
    console.error('Error fetching direct messages:', error)
    throw error
  }
}

// Crear Mensaje directo
export async function createDirectMessage(
  conversationId: number,
  senderId: number,
  content: string
) {
  try {
    const collection = await getDirectMessagesCollection()

    // Validar y sanitizar inputs
    const sanitizedConversationId = Number(conversationId)
    const sanitizedSenderId = Number(senderId)

    if (!Number.isFinite(sanitizedConversationId)) {
      throw new Error('Invalid conversationId')
    }
    if (!Number.isFinite(sanitizedSenderId)) {
      throw new Error('Invalid senderId')
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new Error('Invalid content')
    }

    const newMessage: DirectMessage = {
      conversationId: sanitizedConversationId,
      senderId: sanitizedSenderId,
      content: content.trim(),
      createdAt: new Date(),
    }

    const result = await collection.insertOne(newMessage)

    return {
      id: result.insertedId.toString(),
      conversationId: newMessage.conversationId,
      senderId: newMessage.senderId,
      content: newMessage.content,
      createdAt: newMessage.createdAt.toISOString(),
    }
  } catch (error) {
    console.error('Error creating direct message:', error)
    throw error
  }
}

// Obtener último mensaje directo
export async function getLastDirectMessage(conversationId: number) {
  try {
    const collection = await getDirectMessagesCollection()

    const sanitizedConversationId = Number(conversationId)
    if (!Number.isFinite(sanitizedConversationId)) {
      throw new Error('Invalid conversationId')
    }

    const lastMessage = await collection
      .find({ conversationId: sanitizedConversationId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()

    if (lastMessage.length === 0) {
      return null
    }

    const msg = lastMessage[0]
    if (!msg) return null;

    return {
      id: msg._id.toString(),
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    }
  } catch (error) {
    console.error('Error fetching last direct message:', error)
    throw error
  }
}

// Borrar mensajes de un canal
export async function deleteChannelMessages(channelId: number) {
  try {
    const collection = await getMessagesCollection()

    const sanitizedChannelId = Number(channelId)
    if (!Number.isFinite(sanitizedChannelId)) {
      throw new Error('Invalid channelId')
    }

    const result = await collection.deleteMany({ channelId: sanitizedChannelId })

    console.log(`Deleted ${result.deletedCount} messages from channel ${channelId}`)
    return result.deletedCount
  } catch (error) {
    console.error('Error deleting channel messages:', error)
    throw error
  }
}
