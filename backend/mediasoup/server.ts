import * as mediasoup from 'mediasoup'
import type { Router, Worker, WebRtcServer } from 'mediasoup/types'
import { config } from './config'

class MediasoupServer {
    private workers: Worker[] = []
    private webRtcServers = new Map<Worker, WebRtcServer>()
    private routerWorkers = new Map<Router, Worker>()
    private nextWorkerIndex = 0

    async init() {
        console.log('mediasoup - starting workers...')
        // Con WebRtcServer cada worker necesita su propio puerto, así que se usa 1 worker.
        // Si se necesitan más, asignar un puerto distinto a cada uno (y abrirlo en el firewall).
        const numWorkers = 1

        if (!process.env.MEDIASOUP_ANNOUNCED_IP) {
            console.warn('mediasoup - MEDIASOUP_ANNOUNCED_IP no definida: los clientes remotos no podrán conectar el audio/video')
        }

        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                logLevel: config.worker.logLevel,
                logTags: config.worker.logTags,
                rtcMinPort: config.worker.rtcMinPort,
                rtcMaxPort: config.worker.rtcMaxPort,
            })

            worker.on('died', () => {
                console.error('mediasoup - dead worker')
                setTimeout(() => process.exit(1), 2000)
            })

            const webRtcServer = await worker.createWebRtcServer({
                listenInfos: config.webRtcServer.listenInfos,
            })

            this.workers.push(worker)
            this.webRtcServers.set(worker, webRtcServer)
        }
        console.log(`mediasoup - ${numWorkers} workers started (RTC port ${config.webRtcServer.listenInfos[0]?.port} udp/tcp)`)
    }

    private getWorker(): Worker {
        const worker = this.workers[this.nextWorkerIndex]
        if (!worker) throw new Error('mediasoup no inicializado')
        this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length
        return worker
    }

    // WebRtcServer del worker que creó el router (los transports deben usar el mismo worker)
    getWebRtcServer(router: Router): WebRtcServer {
        const worker = this.routerWorkers.get(router)
        const server = worker ? this.webRtcServers.get(worker) : undefined
        if (!server) throw new Error('WebRtcServer no encontrado para el router')
        return server
    }

    async createRouter(): Promise<Router> {
        const worker = this.getWorker()

        const router = await worker.createRouter({
            mediaCodecs: config.router.mediaCodecs,
        })

        this.routerWorkers.set(router, worker)
        router.observer.once('close', () => this.routerWorkers.delete(router))

        return router
    }
}

export const mediasoupServer = new MediasoupServer()
