import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!, // URL de la base de datos
  authToken: process.env.TURSO_AUTH_TOKEN!, // Token de autenticación
})

export const db = drizzle(client)