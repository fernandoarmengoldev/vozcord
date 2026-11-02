import { sqliteTable, integer, text, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const directConversations = sqliteTable('direct_conversations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userAId: integer('user_a_id').notNull().references(() => users.id),
  userBId: integer('user_b_id').notNull().references(() => users.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
},
  (t) => [uniqueIndex('dm_unique_pair').on(t.userAId, t.userBId),]
)

export const servers = sqliteTable('servers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  ownerId: integer('owner_id').notNull().references(() => users.id),
  icon: text('icon'),
  banner: text('banner'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const members = sqliteTable('members', {
  serverId: integer('server_id').notNull().references(() => servers.id),
  userId: integer('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('member'),
  joinedAt: text('joined_at').default(sql`CURRENT_TIMESTAMP`),
},
  (t) => [primaryKey({ columns: [t.serverId, t.userId] }),]
)

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serverId: integer('server_id').notNull().references(() => servers.id),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
},
  (t) => [
    uniqueIndex('categories_server_name_unique').on(t.serverId, t.name),
    uniqueIndex('categories_server_position').on(t.serverId, t.position),
  ]
)

export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serverId: integer('server_id').notNull().references(() => servers.id),
  categoryId: integer('category_id').references(() => categories.id),
  name: text('name').notNull(),
  type: text('type', { enum: ['text', 'voice'] }).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
},
  (t) => [uniqueIndex('channels_server_name_unique').on(t.serverId, t.name),]
)

export const tables = { users, servers, members, categories, channels, directConversations }