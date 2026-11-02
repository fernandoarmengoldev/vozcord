// Interfaces para los documentos de MongoDB
export interface ChannelMessage {
  channelId: number
  userId: number
  content: string
  createdAt: Date
}

export interface DirectMessage {
  conversationId: number
  senderId: number
  content: string
  createdAt: Date
}