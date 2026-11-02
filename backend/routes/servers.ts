import { Elysia } from 'elysia'
import { db } from '../db/sql/drizzle'
import { channels, members, servers, users } from '../db/sql/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getUserIdFromRequest } from './auth-utils'

export function registerServerRoutes(app: Elysia) {
  return app.group('/servers', (app) =>
    app
      // Listar servidores donde el usuario es miembro
      .get('/', async ({ request, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const memberships = await db
          .select({ serverId: members.serverId })
          .from(members)
          .where(eq(members.userId, userId))
          .all()
        const ids = memberships.map((m) => m.serverId)
        if (ids.length === 0) return { servers: [] }
        const svs = await db
          .select({ id: servers.id, name: servers.name, ownerId: servers.ownerId, icon: servers.icon, createdAt: servers.createdAt })
          .from(servers)
          .where(inArray(servers.id, ids))
          .all()
        return { servers: svs }
      })

      // Crear servidor (el usuario pasa a ser owner y miembro)
      .post('/', async ({ request, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }

        try {
          const formData = await request.formData()
          const name = formData.get('name') as string
          const iconFile = formData.get('icon') as File

          if (!name || !name.trim()) {
            set.status = 400
            return { error: 'name is required' }
          }

          if (!iconFile) {
            set.status = 400
            return { error: 'icon is required' }
          }

          // Validar tipo de archivo
          const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          if (!validTypes.includes(iconFile.type)) {
            set.status = 400
            return { error: 'invalid file type. Only JPEG, PNG, GIF and WebP are allowed' }
          }

          // Validar tamaño (máx 5MB)
          const maxSize = 5 * 1024 * 1024
          if (iconFile.size > maxSize) {
            set.status = 400
            return { error: 'file too large. Maximum size is 5MB' }
          }

          // Generar nombre único para el archivo
          const mimeToExt: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
          }
          const ext = mimeToExt[iconFile.type] || 'jpg'
          const filename = `server-${userId}-${Date.now()}.${ext}`
          const filepath = `./uploads/servers/${filename}`

          // Guardar archivo
          const buffer = await iconFile.arrayBuffer()
          await Bun.write(filepath, buffer)

          // URL del icono
          const iconUrl = `/uploads/servers/${filename}`

          // Crear servidor con icono
          const insertedServer = await db
            .insert(servers)
            .values({ name: name.trim(), ownerId: userId, icon: iconUrl })
            .returning({ id: servers.id, name: servers.name, ownerId: servers.ownerId, icon: servers.icon })
            .get()

          await db
            .insert(members)
            .values({ serverId: insertedServer.id, userId, role: 'owner' })
            .run()

          return { server: insertedServer }
        } catch (error) {
          console.error('Error creating server:', error)
          set.status = 500
          return { error: 'internal server error' }
        }
      })

      // Listar canales de un servidor si el usuario es miembro
      .get('/:serverId/channels', async ({ request, params, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const serverId = Number(params.serverId)
        if (!Number.isFinite(serverId)) {
          set.status = 400
          return { error: 'invalid server id' }
        }
        const member = await db
          .select({ serverId: members.serverId })
          .from(members)
          .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
          .get()
        if (!member) {
          set.status = 403
          return { error: 'forbidden' }
        }
        const ch = await db
          .select({ id: channels.id, name: channels.name, type: channels.type, createdAt: channels.createdAt })
          .from(channels)
          .where(eq(channels.serverId, serverId))
          .all()
        return { channels: ch }
      })

      // Listar miembros de un servidor
      .get('/:serverId/members', async ({ request, params, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const serverId = Number(params.serverId)
        if (!Number.isFinite(serverId)) {
          set.status = 400
          return { error: 'invalid server id' }
        }
        const member = await db
          .select({ serverId: members.serverId })
          .from(members)
          .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
          .get()
        if (!member) {
          set.status = 403
          return { error: 'forbidden' }
        }
        const rows = await db
          .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
          .from(members)
          .innerJoin(users, eq(members.userId, users.id))
          .where(eq(members.serverId, serverId))
          .all()
        return { members: rows }
      })

      // Añadir miembro a un servidor
      .post('/:serverId/members', async ({ request, params, body, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const serverId = Number(params.serverId)
        const { userId: newMemberIdRaw } = (body ?? {}) as { userId?: number | string }
        const newMemberId = Number(newMemberIdRaw)
        if (!Number.isFinite(serverId) || !Number.isInteger(newMemberId)) {
          set.status = 400
          return { error: 'invalid server id or user id' }
        }
        // Verificar que el usuario es miembro del servidor (o owner)
        const srv = await db.select().from(servers).where(eq(servers.id, serverId)).get()
        if (!srv) {
          set.status = 404
          return { error: 'server not found' }
        }
        const isMember = await db
          .select()
          .from(members)
          .where(and(eq(members.serverId, serverId), eq(members.userId, userId)))
          .get()
        if (!isMember && srv.ownerId !== userId) {
          set.status = 403
          return { error: 'forbidden' }
        }
        // Verificar que el nuevo usuario existe
        const newUser = await db.select().from(users).where(eq(users.id, newMemberId)).get()
        if (!newUser) {
          set.status = 404
          return { error: 'user not found' }
        }
        // Verificar que el usuario no es ya miembro
        const alreadyMember = await db
          .select()
          .from(members)
          .where(and(eq(members.serverId, serverId), eq(members.userId, newMemberId)))
          .get()
        if (alreadyMember) {
          set.status = 409
          return { error: 'user already member' }
        }
        // Añadir el miembro
        await db.insert(members).values({ serverId, userId: newMemberId, role: 'member' }).run()
        return { success: true, member: { id: newUser.id, name: newUser.name, email: newUser.email, avatarUrl: newUser.avatarUrl } }
      })

      // Crear canal (solo owner)
      .post('/:serverId/channels', async ({ request, params, body, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const serverId = Number(params.serverId)
        const { name, type } = (body ?? {}) as { name?: string; type?: 'text' | 'voice' }
        if (!Number.isFinite(serverId)) {
          set.status = 400
          return { error: 'invalid server id' }
        }
        if (!name || !name.trim() || (type !== 'text' && type !== 'voice')) {
          set.status = 400
          return { error: 'name and valid type are required' }
        }
        const srv = await db.select().from(servers).where(eq(servers.id, serverId)).get()
        if (!srv) {
          set.status = 404
          return { error: 'server not found' }
        }
        if (srv.ownerId !== userId) {
          set.status = 403
          return { error: 'only owner can create channels' }
        }
        const created = await db
          .insert(channels)
          .values({ serverId, name: name.trim(), type })
          .returning({ id: channels.id, name: channels.name, type: channels.type })
          .get()
        return { channel: created }
      })

      // Actualizar servidor (solo owner)
      .put('/:serverId', async ({ request, params, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const serverId = Number(params.serverId)
        if (!Number.isFinite(serverId)) {
          set.status = 400
          return { error: 'invalid server id' }
        }
        const srv = await db.select().from(servers).where(eq(servers.id, serverId)).get()
        if (!srv) {
          set.status = 404
          return { error: 'server not found' }
        }
        if (srv.ownerId !== userId) {
          set.status = 403
          return { error: 'only owner can update server' }
        }

        try {
          const formData = await request.formData()
          const name = formData.get('name') as string
          const iconFile = formData.get('icon') as File | null

          const updates: { name?: string; icon?: string } = {}

          // Actualizar nombre si se proporciona
          if (name && name.trim()) {
            updates.name = name.trim()
          }

          // Actualizar icono si se proporciona
          if (iconFile && iconFile.size > 0) {
            // Validar tipo de archivo
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if (!validTypes.includes(iconFile.type)) {
              set.status = 400
              return { error: 'invalid file type. Only JPEG, PNG, GIF and WebP are allowed' }
            }

            // Validar tamaño (máx 5MB)
            const maxSize = 5 * 1024 * 1024
            if (iconFile.size > maxSize) {
              set.status = 400
              return { error: 'file too large. Maximum size is 5MB' }
            }

            // Generar nombre único para el archivo
            const mimeToExt: Record<string, string> = {
              'image/jpeg': 'jpg',
              'image/png': 'png',
              'image/gif': 'gif',
              'image/webp': 'webp',
            }
            const ext = mimeToExt[iconFile.type] || 'jpg'
            const filename = `server-${serverId}-${Date.now()}.${ext}`

            // Crear directorio si no existe
            const fs = await import('fs/promises')
            try {
              await fs.mkdir('./uploads/servers', { recursive: true })
            } catch {
              // Directory might already exist, ignore error
            }

            const filepath = `./uploads/servers/${filename}`

            // Guardar archivo
            const buffer = await iconFile.arrayBuffer()
            await Bun.write(filepath, buffer)

            updates.icon = `/uploads/servers/${filename}`
          }

          // Verificar que hay algo que actualizar
          if (Object.keys(updates).length === 0) {
            set.status = 400
            return { error: 'no updates provided' }
          }

          // Actualizar servidor
          const updated = await db
            .update(servers)
            .set(updates)
            .where(eq(servers.id, serverId))
            .returning()
            .get()

          return { server: updated }
        } catch (error) {
          console.error('Error updating server:', error)
          set.status = 500
          return { error: 'internal server error' }
        }
      })

      // Eliminar servidor (solo owner)
      .delete('/:serverId', async ({ request, params, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const serverId = Number(params.serverId)
        if (!Number.isFinite(serverId)) {
          set.status = 400
          return { error: 'invalid server id' }
        }
        const srv = await db.select().from(servers).where(eq(servers.id, serverId)).get()
        if (!srv) {
          set.status = 404
          return { error: 'server not found' }
        }
        if (srv.ownerId !== userId) {
          set.status = 403
          return { error: 'only owner can delete server' }
        }

        // Eliminar todos los canales y sus mensajes
        const serverChannels = await db.select({ id: channels.id }).from(channels).where(eq(channels.serverId, serverId)).all()

        // Eliminar mensajes de MongoDB para cada canal
        const { deleteChannelMessages } = await import('../db/nosql/messages')
        for (const channel of serverChannels) {
          try {
            await deleteChannelMessages(channel.id)
          } catch (error) {
            console.error(`Error deleting messages for channel ${channel.id}:`, error)
          }
        }

        // Eliminar canales
        await db.delete(channels).where(eq(channels.serverId, serverId)).run()

        // Eliminar miembros
        await db.delete(members).where(eq(members.serverId, serverId)).run()

        // Eliminar servidor
        await db.delete(servers).where(eq(servers.id, serverId)).run()

        return { success: true }
      })
  )
}
