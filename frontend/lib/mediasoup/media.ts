import type { Producer } from 'mediasoup-client/types'
import type { DeviceInfo } from './types'
import { getVoiceWebSocketClient } from './voiceWebSocket'

// Inicializar stream local (solo audio), usando el micrófono elegido si hay preferencia
export async function initializeLocalStream(inputDeviceId?: string | null): Promise<MediaStream> {
    if (inputDeviceId) {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: inputDeviceId } },
                video: false,
            })
        } catch (error) {
            // El dispositivo guardado ya no existe: usar el predeterminado
            console.warn('No se pudo usar el micrófono seleccionado, usando el predeterminado:', error)
        }
    }
    return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
    })
}

// Activar/desactivar audio
export async function toggleAudio(
    producer: Producer | undefined,
    channelId: string,
    peerId: string
): Promise<void> {
    if (!producer) return

    const wsClient = getVoiceWebSocketClient()

    if (producer.paused) {
        await producer.resume()
        await wsClient.request('resume-producer', {
            channelId,
            peerId,
            producerId: producer.id,
        })
    } else {
        await producer.pause()
        await wsClient.request('pause-producer', {
            channelId,
            peerId,
            producerId: producer.id,
        })
    }
}

// Solicitar video track
export async function requestVideoTrack(): Promise<MediaStreamTrack> {
    const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
        },
    })
    const [videoTrack] = videoStream.getVideoTracks()

    if (!videoTrack) {
        videoStream.getTracks().forEach((track) => track.stop())
        throw new Error('No video track available from media stream')
    }

    return videoTrack
}

// Activar/desactivar video
export async function toggleVideo(
    producer: Producer | undefined,
    localStream: MediaStream | undefined,
    channelId: string,
    peerId: string
): Promise<{ needsProducer: boolean; videoTrack?: MediaStreamTrack }> {
    if (!localStream) {
        throw new Error('No hay stream local disponible')
    }

    // Si no tenemos video track, solicitarlo ahora
    let videoTrack = localStream.getVideoTracks()[0]

    if (!videoTrack) {
        videoTrack = await requestVideoTrack()
        localStream.addTrack(videoTrack)
        return { needsProducer: true, videoTrack }
    }

    // Si ya existe el producer, pausar/reanudar
    if (producer) {
        const wsClient = getVoiceWebSocketClient()

        if (producer.paused) {
            videoTrack.enabled = true
            await producer.resume()
            await wsClient.request('resume-producer', {
                channelId,
                peerId,
                producerId: producer.id,
            })
        } else {
            videoTrack.enabled = false
            await producer.pause()
            await wsClient.request('pause-producer', {
                channelId,
                peerId,
                producerId: producer.id,
            })
        }
    }

    return { needsProducer: false }
}

// Enumerar dispositivos disponibles
export async function enumerateDevices(): Promise<DeviceInfo> {
    try {
        // Pedir permiso para que enumerateDevices devuelva labels. Audio y vídeo por separado:
        // antes se pedían juntos y, sin cámara, fallaba todo y no se listaba ningún micrófono.
        // Además los tracks no se paraban y el micro/cámara quedaban encendidos.
        for (const constraints of [{ audio: true }, { video: true }] as MediaStreamConstraints[]) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints)
                stream.getTracks().forEach((track) => track.stop())
            } catch {
                // Sin permiso o sin dispositivo de ese tipo
            }
        }

        const devices = await navigator.mediaDevices.enumerateDevices()

        const inputs = devices.filter((device) => device.kind === 'audioinput')
        const outputs = devices.filter((device) => device.kind === 'audiooutput')
        const videoInputs = devices.filter((device) => device.kind === 'videoinput')

        return { inputs, outputs, videoInputs }
    } catch (error) {
        return { inputs: [], outputs: [], videoInputs: [] }
    }
}

// Cambiar dispositivo de entrada de audio
export async function switchInputDevice(
    deviceId: string,
    producer: Producer | undefined,
    localStream: MediaStream | undefined
): Promise<MediaStream> {
    const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
    })

    const newAudioTrack = newStream.getAudioTracks()[0]

    if (!newAudioTrack) {
        throw new Error('No audio track found in new stream')
    }

    if (producer) {
        await producer.replaceTrack({ track: newAudioTrack })
    }

    if (localStream) {
        // Mantener el estado de mute del track anterior
        const previous = localStream.getAudioTracks()[0]
        if (previous) newAudioTrack.enabled = previous.enabled
        localStream.getAudioTracks().forEach((track) => track.stop())
    }

    const videoTracks = localStream?.getVideoTracks() || []
    return new MediaStream([newAudioTrack, ...videoTracks])
}

// Cambiar dispositivo de entrada de video
export async function switchVideoInputDevice(
    deviceId: string,
    producer: Producer | undefined,
    localStream: MediaStream | undefined
): Promise<MediaStream> {
    const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
    })

    const newVideoTrack = newStream.getVideoTracks()[0]

    if (!newVideoTrack) {
        throw new Error('No video track found in new stream')
    }

    if (producer) {
        await producer.replaceTrack({ track: newVideoTrack })
    }

    if (localStream) {
        localStream.getVideoTracks().forEach((track) => track.stop())
    }

    const audioTracks = localStream?.getAudioTracks() || []
    return new MediaStream([...audioTracks, newVideoTrack])
}

// Cambiar dispositivo de salida de audio (solo Web)
export async function switchOutputDevice(deviceId: string): Promise<void> {
    if (typeof document === 'undefined') return

    const audioElements = document.querySelectorAll('audio')

    for (const audio of Array.from(audioElements)) {
        if ('setSinkId' in audio) {
            try {
                // @ts-ignore - setSinkId no está en todos los navegadores
                await audio.setSinkId(deviceId)
            } catch (err) {
                console.error('Error setting audio output device:', err)
            }
        }
    }
}
