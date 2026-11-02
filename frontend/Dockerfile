# Frontend con Bun Serve
# Stage 1: Build
FROM oven/bun:1 AS builder

WORKDIR /app

# Copiar package.json
COPY package.json bun.lock* bun.lockb* ./

# Instalar dependencias
RUN bun install --frozen-lockfile

# Copiar código
COPY . .

# Build argument - Necesario para inyectar la variable en el bundle de Expo
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
RUN echo "EXPO_PUBLIC_API_URL: ${EXPO_PUBLIC_API_URL}"

# Generar build con timeout agresivo (60s)
RUN set -e && \
    echo "Iniciando build de Expo..." && \
    (timeout -s KILL 70 bunx expo export --platform web --clear || echo "Timeout alcanzado") && \
    sleep 3 && \
    if [ -d "dist" ] && [ -f "dist/index.html" ]; then \
        echo "Build completado exitosamente"; \
        ls -la dist/ | head -20; \
    else \
        echo "Build falló - dist/ no generado"; \
        ls -la .; \
        exit 1; \
    fi

# Stage 2: Servir con Bun
FROM oven/bun:1-alpine

WORKDIR /app

# Copiar archivos estáticos desde el builder
COPY --from=builder /app/dist ./dist

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000 || exit 1

# Lanzar servidor estático con bunx serve
CMD ["bunx", "serve", "./dist", "-l", "3000", "-s"]
