// Eliminar barra final si existe para evitar URLs con doble barra
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'https://localhost:3000'
export const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl

export const WS_URL = API_URL.replace(/^https/, 'wss').replace(/^http/, 'ws')
