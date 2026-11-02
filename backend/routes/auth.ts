import { Elysia } from 'elysia'
import { db } from '../db/sql/drizzle'
import { users } from '../db/sql/schema'
import { eq } from 'drizzle-orm'

// Obtener el secreto de JWT de la variable de entorno
const JWT_SECRET = (() => {
  const getJWTSecret = (): string => {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required')
    }
    return secret
  }
  return getJWTSecret()
})()

// Función para codificar en base64url
function base64urlEncode(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

// Función para importar la clave HMAC
async function importHmacKey(secret: string) {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

// Función para firmar un JWT
async function signJWT(payload: Record<string, unknown>, expiresInSeconds = 60 * 60 * 24) {
  // Construir el encabezado del JWT
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { iat: now, exp: now + expiresInSeconds, ...payload }
  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(body)))
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const key = await importHmacKey(JWT_SECRET)
  const sig = await crypto.subtle.sign('HMAC', key, data)
  const sigB64 = base64urlEncode(sig)
  return `${headerB64}.${payloadB64}.${sigB64}`
}

// Función para verificar un JWT
export async function verifyJWT(token: string) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const h = parts[0] as string
  const p = parts[1] as string
  const s = parts[2] as string
  try {
    const key = await importHmacKey(JWT_SECRET)
    const data = new TextEncoder().encode(`${h}.${p}`)
    // atob lanza excepción con base64 inválido: antes un token malformado devolvía 500
    const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const ok = await crypto.subtle.verify('HMAC', key, sig, data)
    if (!ok) return null
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(p.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
      )
    )
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

// Agregar rutas para el manejo de autenticación
export function registerAuthRoutes(app: Elysia) {
  app.group('/auth', app =>
    // Ruta para registrar un usuario
    app
      .post('/register', async ({ body, set }) => {
        const { email, password, name } = (body ?? {}) as { email?: string; password?: string; name?: string }
        if (!email || !password) {
          set.status = 400
          return { error: 'email and password are required' }
        }

        const existing = await db.select().from(users).where(eq(users.email, email)).get()
        if (existing) {
          set.status = 409
          return { error: 'email already registered' }
        }

        const hash = await Bun.password.hash(password)
        const inserted = await db
          .insert(users)
          .values({ email, name: name || null, passwordHash: hash })
          .returning()
          .get()

        const token = await signJWT({ sub: inserted.id, email: inserted.email })
        return { token, user: { id: inserted.id, email: inserted.email, name: inserted.name } }
      })
      // Ruta para iniciar sesión
      .post('/login', async ({ body, set }) => {
        const { email, password } = (body ?? {}) as { email?: string; password?: string }
        if (!email || !password) {
          set.status = 400
          return { error: 'email and password are required' }
        }

        const user = await db.select().from(users).where(eq(users.email, email)).get()
        if (!user || !user.passwordHash) {
          set.status = 401
          return { error: 'invalid credentials' }
        }
        const ok = await Bun.password.verify(password, user.passwordHash)
        if (!ok) {
          set.status = 401
          return { error: 'invalid credentials' }
        }

        const token = await signJWT({ sub: user.id, email: user.email })
        return { token, user: { id: user.id, email: user.email, name: user.name } }
      })
      // Ruta para obtener información del usuario actualmente autenticado
      .get('/me', async ({ request, set }) => {
        const auth = request.headers.get('authorization') || ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
        if (!token) {
          set.status = 401
          return { error: 'missing token' }
        }
        const payload = await verifyJWT(token)
        if (!payload?.sub) {
          set.status = 401
          return { error: 'invalid token' }
        }
        const user = await db.select().from(users).where(eq(users.id, Number(payload.sub))).get()
        if (!user) {
          set.status = 404
          return { error: 'user not found' }
        }
        return { user: { id: user.id, email: user.email, name: user.name } }
      })
  )

  return app
}
