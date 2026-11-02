import { Elysia } from 'elysia'
import { db } from '../db/sql/drizzle'
import { directConversations, users } from '../db/sql/schema'
import { eq, and, or, inArray } from 'drizzle-orm'
import { getUserIdFromRequest } from './auth-utils'
import { getDirectMessagesForConversation, getLastDirectMessage } from '../db/nosql/messages'

export function registerDirectMessageRoutes(app: Elysia) {
  return app.group('/dms', (app) =>
    app
      // Iniciar/conseguir conversación con otro usuario
      .post('/start', async ({ request, body, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const { userId: peerIdRaw } = (body ?? {}) as { userId?: number }
        const peerId = Number(peerIdRaw)
        if (!Number.isFinite(peerId) || peerId === userId) {
          set.status = 400
          return { error: 'invalid peer id' }
        }
        const a = Math.min(userId, peerId)
        const b = Math.max(userId, peerId)
        let conv = await db
          .select()
          .from(directConversations)
          .where(and(eq(directConversations.userAId, a), eq(directConversations.userBId, b)))
          .get()
        if (!conv) {
          conv = await db
            .insert(directConversations)
            .values({ userAId: a, userBId: b })
            .returning()
            .get()
        }
        return { conversation: conv }
      })

      // Listar conversaciones del usuario con último mensaje
      .get('/', async ({ request, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const convs = await db
          .select()
          .from(directConversations)
          .where(or(eq(directConversations.userAId, userId), eq(directConversations.userBId, userId)))
          .all()
        const results = [] as any[]
        for (const c of convs) {
          // Obtener último mensaje desde MongoDB
          try {
            const last = await getLastDirectMessage(c.id!)
            const peerId = c.userAId === userId ? c.userBId : c.userAId
            const peer = await db.select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, peerId)).get()
            results.push({ conversation: c, lastMessage: last ?? null, peer })
          } catch (error) {
            console.error('Error fetching last message for conversation', c.id, error)
            // Continuar con la siguiente conversación si hay error
            const peerId = c.userAId === userId ? c.userBId : c.userAId
            const peer = await db.select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, peerId)).get()
            results.push({ conversation: c, lastMessage: null, peer })
          }
        }
        return { conversations: results }
      })

      // Listar mensajes de una conversación
      .get('/:conversationId/messages', async ({ request, params, query, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const conversationId = Number(params.conversationId)
        if (!Number.isFinite(conversationId)) {
          set.status = 400
          return { error: 'invalid conversation id' }
        }
        const conv = await db.select().from(directConversations).where(eq(directConversations.id, conversationId)).get()
        if (!conv || (conv.userAId !== userId && conv.userBId !== userId)) {
          set.status = 403
          return { error: 'forbidden' }
        }

        // Obtener mensajes desde MongoDB
        const limit = Math.min(Math.max(Number(query?.limit ?? 50), 1), 100)
        const before = query?.beforeCreatedAt ? String(query.beforeCreatedAt) : undefined

        try {
          const rows = await getDirectMessagesForConversation(conversationId, limit, before)

          // Join simple para nombres y avatares de autores
          const authorIds = Array.from(new Set(rows.map((r) => r.senderId)))
          let authorMap = new Map<number, { name: string | null; avatarUrl: string | null }>()
          if (authorIds.length > 0) {
            const authors = await db
              .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
              .from(users)
              .where(inArray(users.id, authorIds))
              .all()
            authors.forEach((a) => authorMap.set(a.id!, { name: a.name ?? a.email, avatarUrl: a.avatarUrl }))
          }
          const result = rows.map((r) => ({
            ...r,
            author: authorMap.get(r.senderId)?.name ?? 'Usuario',
            authorAvatarUrl: authorMap.get(r.senderId)?.avatarUrl ?? null
          }))
          return { messages: result }
        } catch (error) {
          console.error('Error fetching direct messages:', error)
          set.status = 500
          return { error: 'internal server error' }
        }
      })
  )
}
