import type { VoiceWebSocket, WebSocketMessage } from '../types'
import { sendResponse, sendError, broadcast } from '../utils'
import { roomManager } from '../../../mediasoup/rooms'
import { requireRoom } from './room'

// Producir media
export async function handleProduce(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const { channelId, peerId } = requireRoom(ws)
    const { transportId, kind, rtpParameters } = msg.data ?? {}

    if (kind !== 'audio' && kind !== 'video') {
      throw new Error('kind inválido')
    }

    const producerId = await roomManager.produce(channelId, peerId, transportId, kind, rtpParameters)

    sendResponse(ws, msg.id!, { producerId })

    // Notificar a los OTROS peers (antes el propio emisor consumía su propio audio/vídeo)
    broadcast(channelId, {
      type: 'producer-created',
      data: { channelId, peerId, producerId, kind },
    }, ws)

    console.log(`ws_mediasoup - Producer ${producerId} (${kind}) creado para peer ${peerId}`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error produciendo media')
  }
}

// Consumir media
export async function handleConsume(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const { channelId, peerId } = requireRoom(ws)
    const { transportId, producerId, rtpCapabilities } = msg.data ?? {}

    const consumerData = await roomManager.consume(
      channelId,
      peerId,
      transportId,
      producerId,
      rtpCapabilities
    )

    sendResponse(ws, msg.id!, consumerData)

    console.log(`ws_mediasoup - Consumer creado para peer ${peerId}`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error consumiendo media')
  }
}

// Pausar producer
export async function handlePauseProducer(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const { channelId, peerId } = requireRoom(ws)
    const { producerId } = msg.data ?? {}

    await roomManager.pauseProducer(channelId, peerId, producerId)

    sendResponse(ws, msg.id!, { success: true })

    // Notificar a otros peers
    broadcast(channelId, {
      type: 'producer-paused',
      data: { channelId, peerId, producerId },
    }, ws)

    console.log(`ws_mediasoup - Producer ${producerId} pausado`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error pausando producer')
  }
}

// Reanudar producer
export async function handleResumeProducer(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const { channelId, peerId } = requireRoom(ws)
    const { producerId } = msg.data ?? {}

    await roomManager.resumeProducer(channelId, peerId, producerId)

    sendResponse(ws, msg.id!, { success: true })

    // Notificar a otros peers
    broadcast(channelId, {
      type: 'producer-resumed',
      data: { channelId, peerId, producerId },
    }, ws)

    console.log(`ws_mediasoup - Producer ${producerId} reanudado`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error reanudando producer')
  }
}
