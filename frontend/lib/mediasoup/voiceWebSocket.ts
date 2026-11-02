import { WS_URL } from '../config'
import { getToken } from '../auth'

// Mensaje WebSocket genérico
interface WebSocketMessage {
  id?: string
  type: string
  data?: any
  error?: string
}

// Callbacks de eventos de voz (los usa el VoiceService de la llamada activa)
export interface VoiceEventCallbacks {
  onPeerJoined?: (peerId: string, userId: string, channelId: string) => void
  onPeerLeft?: (peerId: string, channelId: string) => void
  onProducerCreated?: (peerId: string, producerId: string, kind: 'audio' | 'video', channelId: string) => void
  onProducerPaused?: (producerId: string, peerId: string) => void
  onProducerResumed?: (producerId: string, peerId: string) => void
  // El socket se ha caído: el backend ya ha sacado al peer de la sala
  onConnectionLost?: () => void
}

// Type para listeners de eventos
type EventListener = (data: any) => void

/**
 * Cliente WebSocket compartido para voz y presencia.
 *
 * - Una sola conexión por app (singleton), compartida por la llamada y la presencia.
 * - Se autentica con el JWT nada más abrir (el backend rechaza cualquier otra operación antes).
 * - Reconecta automáticamente y vuelve a suscribirse a la presencia del servidor actual.
 * - disconnect() es intencional y NO dispara la reconexión.
 */
export class VoiceWebSocketClient {
  private ws: WebSocket | null = null
  private connectPromise: Promise<void> | null = null
  private messageId = 0
  private pendingRequests = new Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }>()
  private eventCallbacks: VoiceEventCallbacks = {}
  private eventListeners = new Map<string, Set<EventListener>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private intentionalClose = false
  private subscribedServerId: number | null = null

  // Conectar (y autenticar). Si ya hay conexión o una en curso, se reutiliza.
  connect(): Promise<void> {
    if (this.isConnected()) return Promise.resolve()
    if (this.connectPromise) return this.connectPromise

    this.intentionalClose = false
    this.connectPromise = this.openSocket()
      .then(() => this.authenticate())
      .then(() => {
        this.reconnectAttempts = 0
      })
      .catch((error) => {
        // Si falla la autenticación no tiene sentido mantener el socket abierto
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.intentionalClose = true
          this.ws.close()
        }
        throw error
      })
      .finally(() => {
        this.connectPromise = null
      })

    return this.connectPromise
  }

  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}/voice`)
      this.ws = ws
      let opened = false

      ws.onopen = () => {
        opened = true
        resolve()
      }

      ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }

      ws.onerror = (error) => {
        console.error('Voice WebSocket error:', error)
        if (!opened) reject(new Error('Error conectando WebSocket de voz'))
      }

      ws.onclose = () => {
        // Ignorar cierres de sockets antiguos
        if (this.ws !== ws) return
        this.ws = null
        if (!opened) reject(new Error('WebSocket de voz cerrado antes de conectar'))
        this.handleDisconnect()
      }
    })
  }

  private async authenticate(): Promise<void> {
    const token = await getToken()
    if (!token) throw new Error('No hay sesión iniciada')
    await this.rawRequest('authenticate', { token })
  }

  // Manejar mensaje recibido
  private handleMessage(data: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data)

      if (message.id && this.pendingRequests.has(message.id)) {
        const { resolve, reject } = this.pendingRequests.get(message.id)!

        if (message.type === 'error') {
          reject(new Error(message.error || 'Error desconocido'))
        } else {
          resolve(message.data)
        }

        this.pendingRequests.delete(message.id)
        return
      }

      if (message.type === 'error') {
        console.warn('Voice WebSocket error sin request asociado:', message.error)
        return
      }

      this.handleEvent(message)
    } catch (error) {
      console.error('Error processing WebSocket message:', error)
    }
  }

  // Manejar evento broadcast
  private handleEvent(message: WebSocketMessage) {
    const { type, data } = message

    // Emitir evento a listeners registrados
    this.emit(type, data)

    switch (type) {
      case 'peer-joined':
        this.eventCallbacks.onPeerJoined?.(data.peerId, data.userId, String(data.channelId))
        break

      case 'peer-left':
        this.eventCallbacks.onPeerLeft?.(data.peerId, String(data.channelId))
        break

      case 'producer-created':
        this.eventCallbacks.onProducerCreated?.(data.peerId, data.producerId, data.kind, String(data.channelId))
        break

      case 'producer-paused':
        this.eventCallbacks.onProducerPaused?.(data.producerId, data.peerId)
        break

      case 'producer-resumed':
        this.eventCallbacks.onProducerResumed?.(data.producerId, data.peerId)
        break
    }
  }

  // Registrar listener de evento
  on(event: string, listener: EventListener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  // Desregistrar listener de evento
  off(event: string, listener: EventListener) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.eventListeners.delete(event)
      }
    }
  }

  // Emitir evento a todos los listeners
  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  // Manejar desconexión
  private handleDisconnect() {
    for (const { reject } of this.pendingRequests.values()) {
      reject(new Error('WebSocket desconectado'))
    }
    this.pendingRequests.clear()

    // El backend elimina al peer de la sala al cerrarse el socket
    this.eventCallbacks.onConnectionLost?.()
    this.emit('connection-lost', null)

    if (this.intentionalClose) return

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++

      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        this.connect()
          .then(() => this.resubscribe())
          .catch(() => {
            // El siguiente onclose programará otro intento
          })
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  // Tras reconectar, volver a suscribirse a la presencia del servidor
  private async resubscribe() {
    if (this.subscribedServerId !== null) {
      await this.subscribeToServer(this.subscribedServerId).catch(() => {})
    }
  }

  // Envío sin esperar a connect() (lo usa la autenticación)
  private rawRequest<T = any>(type: string, data?: any): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket no está conectado'))
    }

    const id = `${Date.now()}-${this.messageId++}`
    const message: WebSocketMessage = { id, type, data }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error('Request timeout'))
      }, 10000)

      this.pendingRequests.set(id, {
        resolve: (data) => {
          clearTimeout(timeout)
          resolve(data)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        },
      })

      this.ws!.send(JSON.stringify(message))
    })
  }

  // Enviar request y esperar respuesta (conecta y autentica si hace falta)
  async request<T = any>(type: string, data?: any): Promise<T> {
    if (!this.isConnected()) {
      await this.connect()
    }
    return this.rawRequest<T>(type, data)
  }

  // Establecer callbacks de eventos
  setEventCallbacks(callbacks: VoiceEventCallbacks) {
    this.eventCallbacks = callbacks
  }

  // Suscribirse a eventos de presencia de un servidor. El backend responde con el
  // estado actual de los canales de voz, que se emite como evento 'presence-snapshot'.
  async subscribeToServer(serverId: number): Promise<void> {
    this.subscribedServerId = serverId
    const result = await this.request<{ presence?: { channelId: string; peers: { userId: string; peerId: string }[] }[] }>(
      'subscribe-to-server',
      { serverId }
    )
    // Puede haber cambiado de servidor mientras esperaba la respuesta
    if (this.subscribedServerId === serverId) {
      this.emit('presence-snapshot', { serverId, presence: result?.presence ?? [] })
    }
  }

  // Desconectar (intencional: no reconecta)
  disconnect() {
    this.intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      const ws = this.ws
      this.ws = null
      ws.close()
    }

    for (const { reject } of this.pendingRequests.values()) {
      reject(new Error('WebSocket desconectado'))
    }
    this.pendingRequests.clear()
    this.subscribedServerId = null
  }

  // Verificar si está conectado (y autenticado)
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.connectPromise === null
  }
}

// Instancia singleton del cliente
let wsClientInstance: VoiceWebSocketClient | null = null

// Obtener cliente WebSocket de voz (singleton)
export function getVoiceWebSocketClient(): VoiceWebSocketClient {
  if (!wsClientInstance) {
    wsClientInstance = new VoiceWebSocketClient()
  }

  return wsClientInstance
}

// Resetear cliente (p. ej. al cerrar sesión)
export function resetVoiceWebSocketClient() {
  if (wsClientInstance) {
    wsClientInstance.disconnect()
    wsClientInstance = null
  }
}

// Alias para compatibilidad
export const getVoiceWebSocket = getVoiceWebSocketClient
