import type { VoiceWebSocket, WebSocketMessage, ConnectionData } from '../types'
import { activeConnections, subscribeToChannel, unsubscribeFromChannel } from '../state'
import { sendResponse, sendError, broadcastPresenceAndRoom } from '../utils'
import { roomManager } from '../../../mediasoup/rooms'
import { db } from '../../../db/sql/drizzle'
import { channels } from '../../../db/sql/schema'
import { eq } from 'drizzle-orm'
import { isServerMember } from './auth'

// Verifica que el canal existe, es de voz y el usuario es miembro del servidor
async function getAccessibleVoiceChannel(channelIdRaw: unknown, userId: number) {
  const channelId = Number(channelIdRaw)
  if (!Number.isInteger(channelId)) {
    throw new Error('channelId inválido')
  }
  const channel = await db.select().from(channels).where(eq(channels.id, channelId)).get()
  if (!channel || channel.type !== 'voice') {
    throw new Error('Canal de voz no encontrado')
  }
  if (!(await isServerMember(channel.serverId, userId))) {
    throw new Error('No eres miembro de este servidor')
  }
  return channel
}

// Devuelve la room/peer de la conexión. Las operaciones de mediasoup usan SIEMPRE
// estos valores y no los que manda el cliente, para que nadie pueda operar
// sobre transports/producers de otro peer.
export function requireRoom(ws: VoiceWebSocket): Required<Pick<ConnectionData, 'channelId' | 'peerId' | 'userId'>> {
  const connection = activeConnections.get(ws)
  if (!connection?.channelId || !connection.peerId || !connection.userId) {
    throw new Error('No estás en ninguna sala de voz')
  }
  return { channelId: connection.channelId, peerId: connection.peerId, userId: connection.userId }
}

// Saca a la conexión de su room actual y notifica la salida
async function leaveCurrentRoom(ws: VoiceWebSocket) {
  const connection = activeConnections.get(ws)
  if (!connection?.channelId || !connection.peerId) return

  const { channelId, peerId } = connection
  connection.channelId = undefined
  connection.peerId = undefined
  connection.userId = undefined

  await roomManager.removePeer(channelId, peerId)
  unsubscribeFromChannel(ws, channelId)

  const channel = await db.select().from(channels).where(eq(channels.id, parseInt(channelId, 10))).get()
  if (channel) {
    broadcastPresenceAndRoom(channel.serverId, channelId, {
      type: 'peer-left',
      data: { channelId, peerId, serverId: channel.serverId },
    })
  }
}

// Obtener RTP capabilities del router
export async function handleGetRtpCapabilities(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const connection = activeConnections.get(ws)!
    const channel = await getAccessibleVoiceChannel(msg.data?.channelId, connection.authUserId!)
    const channelId = String(channel.id)

    await roomManager.createRoom(channelId)
    const rtpCapabilities = roomManager.getRouterRtpCapabilities(channelId)

    if (!rtpCapabilities) {
      throw new Error('No se pudieron obtener las RTP capabilities')
    }

    sendResponse(ws, msg.id!, { rtpCapabilities })
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error obteniendo RTP capabilities')
  }
}

// Unirse a una room
export async function handleJoinRoom(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const { peerId, rtpCapabilities } = msg.data ?? {}
    const connection = activeConnections.get(ws)!

    if (!peerId || typeof peerId !== 'string') {
      throw new Error('peerId inválido')
    }

    const channel = await getAccessibleVoiceChannel(msg.data?.channelId, connection.authUserId!)
    const channelId = String(channel.id)
    // El userId sale del JWT, no del cliente (antes se podía suplantar a otro usuario)
    const userId = String(connection.authUserId)

    // Si ya estaba en otra room con esta conexión, salir primero
    if (connection.channelId && (connection.channelId !== channelId || connection.peerId !== peerId)) {
      await leaveCurrentRoom(ws)
    }

    // Guardar datos de conexión
    connection.channelId = channelId
    connection.peerId = peerId
    connection.userId = userId

    // Suscribir al canal
    subscribeToChannel(ws, channelId)

    // Crear room y agregar peer
    await roomManager.createRoom(channelId)
    roomManager.addPeer(channelId, peerId, userId, rtpCapabilities)

    // Obtener peers existentes
    const peers = roomManager.getRoomStateDetailed(channelId)

    // Notificar a todos los clientes del servidor que un nuevo peer se unió
    broadcastPresenceAndRoom(channel.serverId, channelId, {
      type: 'peer-joined',
      data: { channelId, peerId, userId, serverId: channel.serverId },
    })

    sendResponse(ws, msg.id!, { success: true, peers, userId })

    console.log(`ws_mediasoup - Peer ${peerId} (user ${userId}) unido a room ${channelId}`)
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error uniéndose a la room')
  }
}

// Salir de la room
export async function handleLeaveRoom(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    await leaveCurrentRoom(ws)
    sendResponse(ws, msg.id!, { success: true })
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error saliendo de la room')
  }
}

// Obtener peers en una room
export async function handleGetPeers(ws: VoiceWebSocket, msg: WebSocketMessage) {
  try {
    const connection = activeConnections.get(ws)!
    const channel = await getAccessibleVoiceChannel(msg.data?.channelId, connection.authUserId!)

    const peers = roomManager.getRoomPeers(String(channel.id))

    sendResponse(ws, msg.id!, { peers })
  } catch (error) {
    sendError(ws, msg.id, error instanceof Error ? error.message : 'Error obteniendo peers')
  }
}

// Manejar desconexión inesperada (la conexión ya se está cerrando)
export async function handleDisconnect(ws: VoiceWebSocket, channelId: string, peerId: string) {
  console.log(`ws_mediasoup - Desconexión inesperada del peer: ${peerId}`)

  // Eliminar peer del room manager
  await roomManager.removePeer(channelId, peerId)

  // Desuscribirse del canal
  unsubscribeFromChannel(ws, channelId)

  // Notificar a todos los clientes del servidor
  const channel = await db.select().from(channels).where(eq(channels.id, parseInt(channelId, 10))).get()
  if (channel) {
    broadcastPresenceAndRoom(channel.serverId, channelId, {
      type: 'peer-left',
      data: { channelId, peerId, serverId: channel.serverId },
    }, ws)
  }
}
