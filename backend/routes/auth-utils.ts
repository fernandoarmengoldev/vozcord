import { verifyJWT } from './auth'

export async function getUserIdFromRequest(request: Request): Promise<number | null> {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const payload = await verifyJWT(token)
  const sub = payload?.sub
  if (!sub) return null
  const userId = Number(sub)
  return Number.isFinite(userId) ? userId : null
}
