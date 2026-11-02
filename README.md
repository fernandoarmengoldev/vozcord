# Vozcord

<p align="center">
  <img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/NativeWind-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="NativeWind" />
  <img src="https://img.shields.io/badge/Elysia-6E56CF?style=for-the-badge" alt="Elysia" />
  <img src="https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white" alt="WebRTC" />
  <img src="https://img.shields.io/badge/mediasoup-0084FF?style=for-the-badge" alt="mediasoup" />
  <img src="https://img.shields.io/badge/Turso-4FF8D2?style=for-the-badge&logo=turso&logoColor=black" alt="Turso" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
</p>

![Vozcord](foto.avif)

Vozcord is a cross-platform, real-time communication app for text, voice, and video. The frontend targets web and native platforms, while the backend provides authentication, chat APIs, WebSocket connections, and WebRTC media rooms.

## Features

- User registration, sign-in, profiles, and avatar uploads
- Servers, text and voice channels, and member management
- Real-time channel chat and direct messages
- Voice and video rooms powered by WebRTC
- Optional speech transcription through the Fireworks AI API
- Responsive web interface and Expo-based Android and iOS apps

### Frontend

- Expo and Expo Router
- React, React Native, and React Native Web
- TypeScript, NativeWind, and Tailwind CSS
- mediasoup-client and react-native-webrtc
- Zustand for client-side state

### Backend

- Bun and Elysia
- REST endpoints and native WebSockets
- mediasoup SFU for real-time voice and video
- Turso/libSQL with Drizzle ORM for relational data
- MongoDB for channel and direct messages
- Optional Fireworks AI transcription service

## Project structure

```text
backend/   Bun API, authentication, databases, WebSockets, and mediasoup
frontend/  Expo application for web, Android, and iOS
foto.avif  README image
```

## Requirements

- [Bun](https://bun.sh/) installed
- A Turso/libSQL database and an authentication token
- A MongoDB deployment and connection URI
- A reachable IP address for WebRTC when connecting from other devices
- For native development, the corresponding Android or iOS toolchain

## Configuration

### Backend

From the repository root, create the local environment file:

```sh
cd backend
cp .env.example .env
```

Set the database credentials and a strong, unique JWT secret in `backend/.env`:

```dotenv
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
MONGODB_URI=mongodb+srv://user:password@cluster/database
JWT_SECRET=replace-with-a-long-random-secret
```

Configure `MEDIASOUP_ANNOUNCED_IP` to the IP address clients can reach. The backend uses port `3000` for HTTP and WebSockets, and port `40000` for WebRTC over both UDP and TCP by default. Make the WebRTC port reachable through your firewall and deployment platform.

TLS can be terminated by a reverse proxy such as Caddy or Traefik. For direct TLS, set `TLS_CERT_FILE` and `TLS_KEY_FILE`. Keep credentials and private keys out of Git.

### Frontend

Create `frontend/.env.local` and set the backend URL:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3000
```

For a physical device, replace `localhost` with an address reachable from that device. Use an HTTPS URL for a deployed backend.

## Run locally

Start the backend in one terminal:

```sh
cd backend
bun install
bun run dev
```

Start the frontend in another terminal:

```sh
cd frontend
bun install
bun run start
```

Expo's development server lets you launch the app for web or connect a development device. The frontend package also provides `bun run web`, `bun run android`, `bun run ios`, `bun run lint`, and `bun run typecheck` scripts.

## Docker

Build the backend image using the backend directory as its context:

```sh
docker build -t vozcord-backend ./backend
```

Build the web frontend with the API URL embedded at build time:

```sh
docker build \
  --build-arg EXPO_PUBLIC_API_URL=https://api.example.com \
  -t vozcord-frontend ./frontend
```

The backend image listens on port `3000` and needs the WebRTC port (`40000/udp` and `40000/tcp`) published as well. Provide backend secrets through the deployment environment, not Docker build arguments. Persist `backend/uploads` if uploaded avatars and server icons should survive container replacement.

## Transcription and privacy

Transcription is optional and requires `FIREWORKS_API_KEY`. When enabled, voice audio is sent from the backend to Fireworks AI for transcription. Make this data flow clear to users and obtain any consent required for your deployment.
