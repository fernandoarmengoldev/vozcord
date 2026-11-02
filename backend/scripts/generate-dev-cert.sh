#!/usr/bin/env bash
# Genera certs/cert.pem y certs/key.pem para servir el backend por HTTPS/WSS en la LAN.
#
#   ./scripts/generate-dev-cert.sh                 # usa las IPs de `hostname -I`
#   ./scripts/generate-dev-cert.sh 192.168.1.52    # IPs concretas
#
# Si `mkcert` está instalado se usa (certificado de confianza local, sin avisos en el
# navegador tras `mkcert -install`). Si no, se genera uno autofirmado con openssl que
# incluye subjectAltName (sin SAN, Chrome/Safari rechazan el certificado aunque el CN coincida).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$#" -gt 0 ]; then
  IPS=("$@")
else
  read -r -a IPS <<< "$(hostname -I 2>/dev/null || true)"
fi

mkdir -p certs
for f in certs/cert.pem certs/key.pem; do
  [ -f "$f" ] && mv "$f" "$f.bak.$(date +%Y%m%d%H%M%S)"
done

if command -v mkcert >/dev/null 2>&1; then
  mkcert -cert-file certs/cert.pem -key-file certs/key.pem localhost 127.0.0.1 "${IPS[@]}"
else
  SAN="DNS:localhost,IP:127.0.0.1"
  for ip in "${IPS[@]}"; do SAN="$SAN,IP:$ip"; done
  openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 \
    -keyout certs/key.pem -out certs/cert.pem \
    -subj "/CN=vozcord-dev" \
    -addext "subjectAltName=$SAN" \
    -addext "basicConstraints=critical,CA:FALSE" \
    -addext "extendedKeyUsage=serverAuth"
  echo "Certificado autofirmado generado (SAN: $SAN)"
fi

chmod 600 certs/key.pem
echo "Añade a .env:  TLS_CERT_FILE=./certs/cert.pem  y  TLS_KEY_FILE=./certs/key.pem"
