import presenceService from '../services/presence.js'

export default function setupSocket(app) {
  const io = app.io

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie
      ?.split(';')
      .find(c => c.trim().startsWith('session='))
      ?.split('=')[1]

    if (!token) return next(new Error('Unauthorized'))

    const session = await app.db.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || session.user.deletedAt) return next(new Error('Unauthorized'))

    socket.userId = session.user.id
    socket.username = session.user.username
    next()
  })

  io.on('connection', async (socket) => {
    const userId = socket.userId
    app.log.info(`Socket connected: ${userId}`)

    presenceService.connect(userId, socket.id)
    broadcastPresence(userId, 'online')

    const memberships = await app.db.roomMember.findMany({
      where: { userId },
      select: { roomId: true },
    })
    memberships.forEach(({ roomId }) => socket.join(`room:${roomId}`))
    socket.join(`user:${userId}`)

    socket.on('activity', () => {
      presenceService.activity(userId, socket.id, () => {
        broadcastPresence(userId, 'afk')
      })
    })

    socket.on('join_room', async ({ roomId }) => {
      const member = await app.db.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
      })
      if (member) socket.join(`room:${roomId}`)
    })

    socket.on('disconnect', () => {
      const state = presenceService.disconnect(userId, socket.id)
      if (state === 'offline') broadcastPresence(userId, 'offline')
    })
  })

  function broadcastPresence(userId, status) {
    io.emit('presence', { userId, status })
  }
}
