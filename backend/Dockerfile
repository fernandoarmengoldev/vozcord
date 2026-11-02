# Backend Dockerfile para Dokploy
FROM oven/bun:1 AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json bun.lock* bun.lockb* ./

# Instalar dependencias
RUN bun install --frozen-lockfile

# Copiar el resto del código
COPY . .

# Crear directorios para archivos
RUN mkdir -p uploads/avatars uploads/servers

# Exponer puertos
# 3000: HTTP/WS (el TLS lo termina Traefik/Dokploy, o TLS_CERT_FILE/TLS_KEY_FILE)
# 40000: Mediasoup WebRTC (un único puerto UDP+TCP vía WebRtcServer, MEDIASOUP_PORT)
# IMPORTANTE: el puerto RTC debe publicarse directamente (no pasa por Traefik)
EXPOSE 3000
EXPOSE 40000/udp
EXPOSE 40000/tcp

# Comando de inicio
ENTRYPOINT ["bun", "run", "index.ts"]