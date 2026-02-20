import net from 'node:net'

const listenHost = process.env.PROXY_LISTEN_HOST ?? '127.0.0.1'
const listenPort = Number(process.env.PROXY_LISTEN_PORT ?? 8000)
const targetHost = process.env.PROXY_TARGET_HOST ?? 'backend'
const targetPort = Number(process.env.PROXY_TARGET_PORT ?? 8000)

const server = net.createServer((clientSocket) => {
  const targetSocket = net.connect(targetPort, targetHost)

  clientSocket.pipe(targetSocket)
  targetSocket.pipe(clientSocket)

  const closeSockets = () => {
    clientSocket.destroy()
    targetSocket.destroy()
  }

  clientSocket.on('error', closeSockets)
  targetSocket.on('error', closeSockets)
})

server.on('error', (error) => {
  console.error(`[local-proxy] failed to start: ${error.message}`)
  process.exit(1)
})

server.listen(listenPort, listenHost, () => {
  console.log(
    `[local-proxy] listening on ${listenHost}:${listenPort} -> ${targetHost}:${targetPort}`,
  )
})

const shutdown = () => {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
