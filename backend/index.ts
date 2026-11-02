import 'dotenv/config'
import { existsSync, mkdirSync } from 'node:fs'
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { chatWebSocketHandler } from './ws/chat/index.ts'
import { registerAuthRoutes } from './routes/auth.ts'
import { registerAppRoutes } from './routes/app.ts'
import { connectMongoDB, createMongoIndexes } from './db/nosql/mongodb.ts'
import { mediasoupServer } from './mediasoup/server.ts'
import { voiceWebSocketHandler } from './ws/voice/index.ts'
import { preloadModel } from './services/transcription.ts'

type SocketData = { pathname: '/voice' | '/chat' }

// Los uploads se sirven desde ./uploads; crear las carpetas si no existen
for (const dir of ['uploads/avatars', 'uploads/servers']) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

const app = new Elysia()

app.use(cors())
app.use(staticPlugin({
  assets: 'uploads',
  prefix: '/uploads',
}))

// Endpoint simple para verificar que el servidor funciona
app.get('/', () => ({
  status: 'ok',
  message: 'Backend API is running',
  timestamp: new Date().toISOString(),
  version: '1.0.0'
}))

app.get('/health', () => ({
  status: 'healthy',
  uptime: process.uptime(),
  timestamp: new Date().toISOString()
}))

registerAuthRoutes(app)
registerAppRoutes(app)

// TLS opcional: si se definen TLS_CERT_FILE y TLS_KEY_FILE el servidor arranca en HTTPS/WSS
// (útil en LAN sin proxy). Detrás de Traefik/Dokploy se deja vacío y el proxy termina el TLS.
function loadTlsOptions() {
  const certFile = process.env.TLS_CERT_FILE
  const keyFile = process.env.TLS_KEY_FILE
  if (!certFile || !keyFile) return undefined

  if (!existsSync(certFile) || !existsSync(keyFile)) {
    throw new Error(`No se encuentran los certificados TLS (${certFile}, ${keyFile})`)
  }
  return { cert: Bun.file(certFile), key: Bun.file(keyFile) }
}

// Inicializar MongoDB y mediasoup antes de arrancar el servidor
async function startServer() {
  try {
    // Conectar a MongoDB y crear índices
    await connectMongoDB()
    await createMongoIndexes()

    // Inicializar mediasoup workers
    await mediasoupServer.init()

    // Comprobar configuración de transcripción (API externa)
    preloadModel().catch(err => console.error('Error preloading transcription model:', err))

    const hostname = process.env.SERVER_HOST || '0.0.0.0'
    const port = Number(process.env.SERVER_PORT) || 3000
    const tls = loadTlsOptions()

    Bun.serve<SocketData, never>({
      hostname,
      port,
      tls,
      fetch(req, server) {
        const url = new URL(req.url)

        // WebSockets nativos de voz y chat
        if (url.pathname === '/voice' || url.pathname === '/chat') {
          const upgraded = server.upgrade(req, {
            data: { pathname: url.pathname },
          })

          if (upgraded) {
            return undefined
          }

          return new Response('WebSocket upgrade failed', { status: 400 })
        }

        // Delegar todas las demás peticiones a Elysia
        return app.fetch(req)
      },
      websocket: {
        open(ws) {
          if (ws.data.pathname === '/voice') {
            voiceWebSocketHandler.open(ws as any)
          } else {
            chatWebSocketHandler.open(ws as any)
          }
        },
        message(ws, message) {
          if (ws.data.pathname === '/voice') {
            voiceWebSocketHandler.message(ws as any, message)
          } else {
            chatWebSocketHandler.message(ws as any, message)
          }
        },
        close(ws) {
          if (ws.data.pathname === '/voice') {
            voiceWebSocketHandler.close(ws as any)
          } else {
            chatWebSocketHandler.close(ws as any)
          }
        },
      },
    })

    const http = tls ? 'https' : 'http'
    const ws = tls ? 'wss' : 'ws'
    console.log(`\n   - Local:    ${http}://localhost:${port}`)
    if (hostname === '0.0.0.0') {
      console.log(`   - Network:  ${http}://<IP>:${port} (todas las interfaces)`)
    } else {
      console.log(`   - Network:  ${http}://${hostname}:${port}`)
    }
    console.log(`   - Voice WS: ${ws}://localhost:${port}/voice`)
    console.log(`   - Chat WS:  ${ws}://localhost:${port}/chat`)
    if (!tls) {
      console.log('   - TLS desactivado: usa un proxy (Traefik/Caddy) o define TLS_CERT_FILE/TLS_KEY_FILE')
    }
    console.log('')
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
