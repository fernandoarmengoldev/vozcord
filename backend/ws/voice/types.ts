import type { ServerWebSocket } from 'bun'

// Mensaje WebSocket genérico
export interface WebSocketMessage {
  id?: string // ID único para request/response pattern
  type: string // Tipo de operación
  data?: any // Datos del mensaje
  error?: string // Error si existe
}

// Datos de conexión activa
export interface ConnectionData {
  // Usuario autenticado (JWT verificado en el mensaje 'authenticate')
  authUserId?: number
  // Servidor del que se reciben eventos de presencia
  serverId?: number
  // Room de voz actual
  channelId?: string
  peerId?: string
  userId?: string
}

// Tipo de WebSocket con datos de voice
export type VoiceWebSocket = ServerWebSocket<ConnectionData>
