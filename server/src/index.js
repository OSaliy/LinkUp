import 'dotenv/config'
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyCookie from '@fastify/cookie'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import fastifySocketIo from 'fastify-socket.io'
import { join, dirname } from 'path'
import { existsSync, createReadStream } from 'fs'
import { fileURLToPath } from 'url'

import dbPlugin from './plugins/db.js'
import authPlugin from './plugins/auth.js'
import setupSocket from './plugins/socket.js'

import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import roomsRoutes from './routes/rooms.js'
import messagesRoutes from './routes/messages.js'
import contactsRoutes from './routes/contacts.js'
import filesRoutes from './routes/files.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = process.env.UPLOADS_DIR || join(__dirname, '../../uploads')
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost'
const PUBLIC_DIR = join(__dirname, '../public')
const serveClient = existsSync(PUBLIC_DIR)

const app = Fastify({ logger: true })

await app.register(fastifyCors, {
  origin: serveClient ? false : CLIENT_URL,
  credentials: true,
})
await app.register(fastifyCookie)
await app.register(fastifyMultipart, {
  limits: { fileSize: 20 * 1024 * 1024 },
})
await app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: '/uploads/',
  decorateReply: false,
})
// Serve built React app when public/ dir exists (production / Fly deploy)
if (serveClient) {
  await app.register(fastifyStatic, {
    root: PUBLIC_DIR,
    prefix: '/',
    decorateReply: false,
    wildcard: false,
  })
}
await app.register(fastifySocketIo, {
  cors: { origin: serveClient ? false : CLIENT_URL, credentials: true },
})

await app.register(dbPlugin)
await app.register(authPlugin)

await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(usersRoutes, { prefix: '/api/users' })
await app.register(roomsRoutes, { prefix: '/api/rooms' })
await app.register(messagesRoutes, { prefix: '/api/messages' })
await app.register(contactsRoutes, { prefix: '/api/contacts' })
await app.register(filesRoutes, { prefix: '/api/files' })

app.get('/api/health', async () => ({ ok: true }))

// SPA fallback — serve index.html for all non-API routes
if (serveClient) {
  app.setNotFoundHandler((req, reply) => {
    if (!req.url.startsWith('/api') && !req.url.startsWith('/socket.io') && !req.url.startsWith('/uploads')) {
      reply.header('Content-Type', 'text/html')
      return reply.send(createReadStream(join(PUBLIC_DIR, 'index.html')))
    }
    reply.code(404).send({ error: 'Not found' })
  })
}

setupSocket(app)

const PORT = parseInt(process.env.PORT || '3000', 10)
try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
