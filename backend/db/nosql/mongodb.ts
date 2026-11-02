import { MongoClient, Db, Collection } from 'mongodb'
import type { ChannelMessage, DirectMessage } from './schema'

// Cliente y base de datos de MongoDB
let client: MongoClient | null = null
let db: Db | null = null

export async function connectMongoDB(): Promise<Db> {
  if (db) {
    return db
  }

  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  try {
    console.log('mongodb - connecting...')
    client = new MongoClient(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    })

    await client.connect()
    db = client.db()

    console.log('mongodb - connected')
    return db
  } catch (error) {
    console.error('mongodb - connection error:', error)
    throw error
  }
}

// Obtiene la base de datos de MongoDB
export async function getMongoDB(): Promise<Db> {
  if (!db) {
    return await connectMongoDB()
  }
  return db
}

// Obtiene mensajes de canal
export async function getMessagesCollection(): Promise<Collection<ChannelMessage>> {
  const database = await getMongoDB()
  return database.collection<ChannelMessage>('messages')
}

// Obtiene mensajes directos
export async function getDirectMessagesCollection(): Promise<Collection<DirectMessage>> {
  const database = await getMongoDB()
  return database.collection<DirectMessage>('directMessages')
}

// Cierra la conexión de MongoDB
export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log('mongodb - connection closed')
  }
}

// Crea los índices necesarios para optimizar las consultas
export async function createMongoIndexes(): Promise<void> {
  try {
    const messagesCol = await getMessagesCollection()
    const directMessagesCol = await getDirectMessagesCollection()

    // Índices para mensajes de canal
    // Índice compuesto para consultas por canal ordenadas por fecha
    await messagesCol.createIndex(
      { channelId: 1, createdAt: -1 },
      { name: 'channelId_createdAt_idx' }
    )
    // Índice para búsquedas por usuario
    await messagesCol.createIndex(
      { userId: 1 },
      { name: 'userId_idx' }
    )

    // Índices para mensajes directos
    // Índice compuesto para consultas por conversación ordenadas por fecha
    await directMessagesCol.createIndex(
      { conversationId: 1, createdAt: -1 },
      { name: 'conversationId_createdAt_idx' }
    )
    // Índice para búsquedas por remitente
    await directMessagesCol.createIndex(
      { senderId: 1 },
      { name: 'senderId_idx' }
    )

    console.log('mongodb - indexes created')
  } catch (error) {
    console.error('mongodb - error creating indexes:', error)
    throw error
  }
}
