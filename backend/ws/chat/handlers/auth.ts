import type { ChatWebSocket, WebSocketMessage } from '../types'
import { activeConnections } from '../state'
import { sendResponse, sendError } from '../utils'
import { verifyJWT } from '../../../routes/auth'

// Autenticar conexión WebSocket
export async function handleAuthenticate(ws: ChatWebSocket, msg: WebSocketMessage) {
  try {
    const { token } = msg.data ?? {}

    if (!token) {
      throw new Error('Token no proporcionado')
    }

    // Verificar token JWT usando la función personalizada
    const payload = await verifyJWT(token)

    if (!payload?.sub) {
      throw new Error('Token inválido')
    }

    const userId = Number(payload.sub)
    if (!Number.isFinite(userId)) {
      throw new Error('Token inválido')
    }

    // Guardar datos de autenticación
    const connectionData = activeConnections.get(ws)
    if (connectionData) {
      connectionData.userId = userId
      connectionData.token = token
    }

    sendResponse(ws, msg.id!, { success: true, userId })

    console.log(`ws_chat - Usuario ${userId} autenticado en chat`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error de autenticación')
  }
}
