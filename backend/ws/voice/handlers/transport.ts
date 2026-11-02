import type { VoiceWebSocket, WebSocketMessage } from '../types'
import { sendResponse, sendError } from '../utils'
import { roomManager } from '../../../mediasoup/rooms'
import { requireRoom } from './room'

// Crear WebRTC transport
export async function handleCreateTransport(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const { channelId, peerId } = requireRoom(ws)
    const direction = msg.data?.direction === 'recv' ? 'recv' : 'send'

    const transportData = await roomManager.createWebRtcTransport(channelId, peerId)

    // Guardar el tipo de transport en appData
    const peer = roomManager.getPeer(channelId, peerId)
    const transport = peer?.transports.get(transportData.id)
    if (transport) {
      transport.appData = { type: direction }
    }

    sendResponse(ws, msg.id!, transportData)

    console.log(`ws_mediasoup - Transport ${direction} creado para peer ${peerId}`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error creando transport')
  }
}

// Conectar transport
export async function handleConnectTransport(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const { channelId, peerId } = requireRoom(ws)
    const { transportId, dtlsParameters } = msg.data ?? {}

    await roomManager.connectTransport(channelId, peerId, transportId, dtlsParameters)

    sendResponse(ws, msg.id!, { success: true })

    console.log(`ws_mediasoup - Transport ${transportId} conectado`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error conectando transport')
  }
}
