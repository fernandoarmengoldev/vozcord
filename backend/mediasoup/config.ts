import type { RtpCodecCapability, WorkerLogLevel, WorkerLogTag, TransportListenInfo } from "mediasoup/types"

// IP pública/LAN que se anuncia a los clientes en los candidatos ICE.
// Si no se define, mediasoup anunciará la IP de la interfaz (0.0.0.0 no sirve),
// por lo que en la práctica es OBLIGATORIA cuando se escucha en 0.0.0.0.
const announcedAddress = process.env.MEDIASOUP_ANNOUNCED_IP || undefined

// Puerto único (UDP + TCP) que comparten TODOS los transports gracias a WebRtcServer.
// Antes cada transport reservaba un puerto del rango 40000-40005, lo que limitaba
// el servidor a 6 transports = 3 usuarios en voz simultáneamente.
const rtcPort = Number(process.env.MEDIASOUP_PORT) || 40000

export const config = {
    // Worker settings
    worker: {
        // Rango de reserva por si algún transport se crea sin WebRtcServer
        rtcMinPort: rtcPort,
        rtcMaxPort: rtcPort + 5,
        logLevel: 'warn' as WorkerLogLevel,
        logTags: [
            'info',
            'ice',
            'dtls',
            'rtp',
            'srtp',
            'rtcp',
        ] as WorkerLogTag[],
    },

    // Router settings
    router: {
        // El SFU no transcodifica: emisor y receptor deben compartir códec.
        // mediasoup-client usa el primer códec del router que soporte el navegador,
        // así que VP8 va primero (soportado por Chrome, Firefox, Safari y react-native-webrtc).
        // H264 como alternativa (hardware en iOS) y AV1 se mantiene al final.
        mediaCodecs: [
            {
                kind: 'audio' as const,
                mimeType: 'audio/opus' as const,
                clockRate: 48000,
                channels: 2,
            },
            {
                kind: 'video' as const,
                mimeType: 'video/VP8' as const,
                clockRate: 90000,
                parameters: {
                    'x-google-start-bitrate': 1000,
                },
            },
            {
                kind: 'video' as const,
                mimeType: 'video/H264' as const,
                clockRate: 90000,
                parameters: {
                    'packetization-mode': 1,
                    'profile-level-id': '42e01f',
                    'level-asymmetry-allowed': 1,
                    'x-google-start-bitrate': 1000,
                },
            },
            {
                kind: 'video' as const,
                mimeType: 'video/AV1' as const,
                clockRate: 90000,
                parameters: {},
            },
        ] as RtpCodecCapability[],
    },

    // WebRtcServer: un único puerto UDP/TCP para todos los transports
    webRtcServer: {
        listenInfos: [
            {
                protocol: 'udp',
                ip: '0.0.0.0',
                announcedAddress,
                port: rtcPort,
            },
            {
                protocol: 'tcp',
                ip: '0.0.0.0',
                announcedAddress,
                port: rtcPort,
            },
        ] as TransportListenInfo[],
    },

    // WebRTC transport settings
    webRtcTransport: {
        initialAvailableOutgoingBitrate: 1000000,
        minimumAvailableOutgoingBitrate: 600000,
        maxSctpMessageSize: 262144,
        maxIncomingBitrate: 1500000,
    },
} as const
