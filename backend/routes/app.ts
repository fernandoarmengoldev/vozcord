import { Elysia } from 'elysia'
import { registerServerRoutes } from './servers'
import { registerDirectMessageRoutes } from './directMessages'
import { registerChannelRoutes } from './channels'
import { registerUserRoutes } from './users'

export function registerAppRoutes(app: Elysia) {
  registerServerRoutes(app)
  registerDirectMessageRoutes(app)
  registerChannelRoutes(app)
  registerUserRoutes(app)
  return app
}
