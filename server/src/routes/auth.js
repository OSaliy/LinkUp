import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { UAParser } from 'ua-parser-js'

const BCRYPT_ROUNDS = 12
const SESSION_COOKIE = 'session'
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

export default async function authRoutes(app) {
  app.post('/register', async (req, reply) => {
    const { email, username, password } = req.body
    if (!email || !username || !password) {
      return reply.code(400).send({ error: 'email, username, password required' })
    }
    if (password.length < 8) {
      return reply.code(400).send({ error: 'Password min 8 characters' })
    }

    const existing = await app.db.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })
    if (existing?.email === email) return reply.code(409).send({ error: 'Email taken' })
    if (existing?.username === username) return reply.code(409).send({ error: 'Username taken' })

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const user = await app.db.user.create({
      data: { email, username, passwordHash },
      select: { id: true, email: true, username: true, createdAt: true },
    })

    const token = await createSession(app, req, user.id)
    reply.setCookie(SESSION_COOKIE, token, COOKIE_OPTS)
    return reply.code(201).send({ user })
  })

  app.post('/login', async (req, reply) => {
    const { email, password, remember } = req.body
    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password required' })
    }

    const user = await app.db.user.findUnique({ where: { email } })
    if (!user || user.deletedAt) return reply.code(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })

    const token = await createSession(app, req, user.id)
    const cookieOpts = remember ? COOKIE_OPTS : { ...COOKIE_OPTS, maxAge: undefined }
    reply.setCookie(SESSION_COOKIE, token, cookieOpts)

    return {
      user: { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt },
    }
  })

  app.post('/logout', { preHandler: app.authenticate }, async (req, reply) => {
    await app.db.session.delete({ where: { id: req.sessionId } })
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  })

  app.get('/me', { preHandler: app.authenticate }, async (req) => {
    const u = req.user
    return { id: u.id, email: u.email, username: u.username, createdAt: u.createdAt }
  })

  app.get('/sessions', { preHandler: app.authenticate }, async (req) => {
    return app.db.session.findMany({
      where: { userId: req.user.id },
      select: { id: true, browser: true, ip: true, createdAt: true, lastActiveAt: true },
      orderBy: { lastActiveAt: 'desc' },
    })
  })

  app.delete('/sessions/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const session = await app.db.session.findUnique({ where: { id: req.params.id } })
    if (!session || session.userId !== req.user.id) {
      return reply.code(404).send({ error: 'Not found' })
    }
    await app.db.session.delete({ where: { id: req.params.id } })
    return { ok: true }
  })

  app.post('/forgot-password', async (req, reply) => {
    const { email } = req.body
    const user = await app.db.user.findUnique({ where: { email } })
    if (!user) return { ok: true } // don't leak existence

    await app.db.passwordResetToken.deleteMany({ where: { userId: user.id } })

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1h
    await app.db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    })

    // In production: send email. For hackathon, return token directly.
    return { ok: true, resetToken: token }
  })

  app.post('/reset-password', async (req, reply) => {
    const { token, password } = req.body
    if (!token || !password) return reply.code(400).send({ error: 'token and password required' })
    if (password.length < 8) return reply.code(400).send({ error: 'Password min 8 characters' })

    const record = await app.db.passwordResetToken.findUnique({ where: { token } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return reply.code(400).send({ error: 'Invalid or expired token' })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    await app.db.$transaction([
      app.db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      app.db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ])
    return { ok: true }
  })

  app.put('/password', { preHandler: app.authenticate }, async (req, reply) => {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return reply.code(400).send({ error: 'currentPassword and newPassword required' })
    }
    if (newPassword.length < 8) return reply.code(400).send({ error: 'Password min 8 characters' })

    const user = await app.db.user.findUnique({ where: { id: req.user.id } })
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return reply.code(401).send({ error: 'Current password incorrect' })

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await app.db.user.update({ where: { id: req.user.id }, data: { passwordHash } })
    return { ok: true }
  })
}

async function createSession(app, req, userId) {
  const token = uuidv4()
  const ua = UAParser(req.headers['user-agent'] || '')
  const browser = [ua.browser?.name, ua.os?.name].filter(Boolean).join(' / ') || 'Unknown'
  const ip = req.ip

  await app.db.session.create({
    data: { userId, token, browser, ip },
  })
  return token
}
