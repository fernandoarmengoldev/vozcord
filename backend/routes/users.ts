import { Elysia } from 'elysia'
import { db } from '../db/sql/drizzle'
import { users } from '../db/sql/schema'
import { and, eq, ne, or, sql } from 'drizzle-orm'
import { getUserIdFromRequest } from './auth-utils'

export function registerUserRoutes(app: Elysia) {
  return app.group('/users', (app) =>
    app
      // Buscar usuarios por nombre o email
      .get('/search', async ({ request, query, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const q = (query.q || '').trim()
        if (!q) {
          return { users: [] }
        }
        try {
          // Filtrar en la base de datos en vez de cargar todos los usuarios en memoria.
          // LIKE en SQLite no distingue mayúsculas/minúsculas para ASCII.
          const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
          const filtered = await db
            .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
            .from(users)
            .where(
              and(
                ne(users.id, userId),
                or(
                  sql`${users.name} LIKE ${pattern} ESCAPE '\\'`,
                  sql`${users.email} LIKE ${pattern} ESCAPE '\\'`
                )
              )
            )
            .limit(10)
            .all()

          return { users: filtered }
        } catch (error) {
          console.error('Error searching users:', error)
          set.status = 500
          return { error: 'search failed' }
        }
      })

      // Obtener perfil del usuario autenticado
      .get('/me', async ({ request, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }
        const user = await db
          .select({ id: users.id, email: users.email, name: users.name, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.id, userId))
          .get()
        if (!user) {
          set.status = 404
          return { error: 'user not found' }
        }
        return { user }
      })

      // Subir avatar
      .post('/avatar', async ({ request, set }) => {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
          set.status = 401
          return { error: 'unauthorized' }
        }

        try {
          const formData = await request.formData()
          const file = formData.get('avatar') as File

          if (!file) {
            set.status = 400
            return { error: 'no file provided' }
          }

          // Validar tipo de archivo
          const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          if (!validTypes.includes(file.type)) {
            set.status = 400
            return { error: 'invalid file type. Only JPEG, PNG, GIF and WebP are allowed' }
          }

          // Validar tamaño (máx 5MB)
          const maxSize = 5 * 1024 * 1024
          if (file.size > maxSize) {
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
          const ext = mimeToExt[file.type] || 'jpg'
          const filename = `${userId}-${Date.now()}.${ext}`
          const filepath = `./uploads/avatars/${filename}`

          // Guardar archivo
          const buffer = await file.arrayBuffer()
          await Bun.write(filepath, buffer)

          // Actualizar URL del avatar en la base de datos
          const avatarUrl = `/uploads/avatars/${filename}`
          await db
            .update(users)
            .set({ avatarUrl })
            .where(eq(users.id, userId))
            .run()

          return { avatarUrl }
        } catch (error) {
          console.error('Error uploading avatar:', error)
          set.status = 500
          return { error: 'internal server error' }
        }
      })
  )
}
