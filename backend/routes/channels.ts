import { Elysia } from 'elysia'
import { db } from '../db/sql/drizzle'
import { channels, members, servers, users } from '../db/sql/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getUserIdFromRequest } from './auth-utils'
import { getChannelMessages } from '../db/nosql/messages'

export function registerChannelRoutes(app: Elysia) {
  return app.group('/channels', (app) =>
    app
      // Listar mensajes de un canal con paginación simple
      .get('/:channelId/messages', async ({ request, params, query, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const channelId = Number(params.channelId)
        if (!Number.isFinite(channelId)) {
          set.status = 400
          return { error: 'invalid channel id' }
        }
        // Comprobar membresía del servidor del canal
        const ch = await db.select().from(channels).where(eq(channels.id, channelId)).get()
        if (!ch) {
          set.status = 404
          return { error: 'channel not found' }
        }
        const member = await db
          .select()
          .from(members)
          .where(and(eq(members.serverId, ch.serverId), eq(members.userId, userId)))
          .get()
        if (!member) {
          set.status = 403
          return { error: 'forbidden' }
        }

        // Obtener mensajes desde MongoDB
        const limit = Math.min(Math.max(Number(query?.limit ?? 50), 1), 100)
        const before = query?.beforeCreatedAt ? String(query.beforeCreatedAt) : undefined

        try {
          const rows = await getChannelMessages(channelId, limit, before)

          // Join simple para nombres y avatares de autores
          const authorIds = Array.from(new Set(rows.map((r) => r.userId)))
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
            author: authorMap.get(r.userId)?.name ?? 'Usuario',
            authorAvatarUrl: authorMap.get(r.userId)?.avatarUrl ?? null
          }))
          return { messages: result }
        } catch (error) {
          console.error('Error fetching messages:', error)
          set.status = 500
          return { error: 'internal server error' }
        }
      })

      // Eliminar canal
      .delete('/:channelId', async ({ request, params, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const channelId = Number(params.channelId)
        if (!Number.isFinite(channelId)) {
          set.status = 400
          return { error: 'invalid channel id' }
        }
        const ch = await db.select().from(channels).where(eq(channels.id, channelId)).get()
        if (!ch) {
          set.status = 404
          return { error: 'channel not found' }
        }

        // Verificar que el usuario es el owner del servidor
        const srv = await db.select().from(servers).where(eq(servers.id, ch.serverId)).get()
        if (!srv) {
          set.status = 404
          return { error: 'server not found' }
        }
        if (srv.ownerId !== userId) {
          set.status = 403
          return { error: 'only owner can delete channels' }
        }

        // Eliminar mensajes de MongoDB
        const { deleteChannelMessages } = await import('../db/nosql/messages')
        try {
          await deleteChannelMessages(channelId)
        } catch (error) {
          console.error(`Error deleting messages for channel ${channelId}:`, error)
        }

        // Eliminar canal
        await db.delete(channels).where(eq(channels.id, channelId)).run()

        return { success: true }
      })
  )
}
