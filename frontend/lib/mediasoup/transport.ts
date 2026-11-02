import type { Device, Transport } from 'mediasoup-client/types'
import { getVoiceWebSocketClient } from './voiceWebSocket'

// Crear transport de envío (send)
export async function createSendTransport(
    device: Device,
    channelId: string,
    peerId: string
): Promise<Transport> {
    const wsClient = getVoiceWebSocketClient()

    const transportData = await wsClient.request('create-transport', {
        channelId,
        peerId,
        direction: 'send',
    })

    const transport = device.createSendTransport(transportData)

    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
            await wsClient.request('connect-transport', {
                channelId,
                peerId,
                transportId: transport.id,
                dtlsParameters,
            })
            callback()
        } catch (error) {
            errback(error as Error)
        }
    })

    transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
            const { producerId } = await wsClient.request('produce', {
                channelId,
                peerId,
                transportId: transport.id,
                kind,
                rtpParameters,
            })

            callback({ id: producerId })
        } catch (error) {
            errback(error as Error)
        }
    })

    return transport
}

// Crear transport de recepción (recv)
export async function createRecvTransport(
    device: Device,
    channelId: string,
    peerId: string
): Promise<Transport> {
    const wsClient = getVoiceWebSocketClient()

    const transportData = await wsClient.request('create-transport', {
        channelId,
        peerId,
        direction: 'recv',
    })

    const transport = device.createRecvTransport(transportData)

    transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
            await wsClient.request('connect-transport', {
                channelId,
                peerId,
                transportId: transport.id,
                dtlsParameters,
            })
            callback()
        } catch (error) {
            errback(error as Error)
        }
    })

    return transport
}
