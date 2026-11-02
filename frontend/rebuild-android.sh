#!/bin/bash
echo "Limpiando caché..."
rm -rf .expo node_modules/.cache android/app/build android/.gradle

echo "Reinstalando dependencias..."
bun install

echo "Limpiando Gradle..."
cd android && ./gradlew clean && cd ..

echo "Listo! Ahora ejecuta: expo start --clear"
