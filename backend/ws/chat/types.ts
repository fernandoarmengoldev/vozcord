import type { ServerWebSocket } from 'bun'

// Mensaje WebSocket genérico
export interface WebSocketMessage {
  id?: string // ID único para request/response pattern
  type: string // Tipo de operación
  data?: any // Datos del mensaje
  error?: string // Error si existe
}

// Datos de conexión activa
export interface ChatConnectionData {
  userId?: number
  token?: string
  channelSubscriptions: Set<number>
  dmSubscriptions: Set<number>
}

// Tipo de WebSocket con datos de chat
export type ChatWebSocket = ServerWebSocket<ChatConnectionData>
