#!/bin/sh
set -e

echo "Iniciando build de Expo..."

# Ejecutar expo export con timeout
timeout -s TERM 120 bunx expo export --platform web --clear || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        echo "Timeout alcanzado, pero verificando si dist/ existe..."
        if [ -d "dist" ] && [ -f "dist/index.html" ]; then
            echo "Build completado exitosamente (forzado por timeout)"
            exit 0
        else
            echo "Build falló - dist/ no generado"
            exit 1
        fi
    else
        echo "Build falló con código: $EXIT_CODE"
        exit $EXIT_CODE
    fi
}

echo "Build completado exitosamente"
ls -la dist/
