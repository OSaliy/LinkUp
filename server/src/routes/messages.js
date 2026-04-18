const MAX_CONTENT = 3 * 1024 // 3 KB

export default async function messagesRoutes(app) {
  // Get messages (paginated)
  app.get('/room/:roomId', { preHandler: app.authenticate }, async (req, reply) => {
    const { roomId } = req.params
    const { before, limit = 50 } = req.query

    const member = await app.db.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: req.user.id } },
    })
    if (!member) return reply.code(403).send({ error: 'Not a member' })

    return app.db.message.findMany({
      where: {
        roomId,
        deletedAt: null,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        author: { select: { id: true, username: true } },
        attachments: true,
        replyTo: {
          include: { author: { select: { id: true, username: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit), 100),
    })
  })

  // Send message
  app.post('/room/:roomId', { preHandler: app.authenticate }, async (req, reply) => {
    const { roomId } = req.params
    const { content, replyToId } = req.body

    if (!content || content.length > MAX_CONTENT) {
      return reply.code(400).send({ error: `Content required, max ${MAX_CONTENT} bytes` })
    }

    const room = await app.db.room.findUnique({ where: { id: roomId } })
    if (!room || room.deletedAt) return reply.code(404).send({ error: 'Room not found' })
    if (room.lockedAt) return reply.code(403).send({ error: 'Chat is locked' })

    const member = await app.db.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: req.user.id } },
    })
    if (!member) return reply.code(403).send({ error: 'Not a member' })

    if (room.visibility === 'DIRECT') {
      const participants = await app.db.roomMember.findMany({ where: { roomId } })
      const otherUserId = participants.find(p => p.userId !== req.user.id)?.userId
      if (otherUserId) {
        const ban = await app.db.userBan.findFirst({
          where: {
            OR: [
              { bannerId: req.user.id, bannedId: otherUserId },
              { bannerId: otherUserId, bannedId: req.user.id },
            ],
          },
        })
        if (ban) return reply.code(403).send({ error: 'Cannot message this user' })
      }
    }

    const message = await app.db.message.create({
      data: { roomId, authorId: req.user.id, content, replyToId },
      include: {
        author: { select: { id: true, username: true } },
        attachments: true,
        replyTo: { include: { author: { select: { id: true, username: true } } } },
      },
    })

    app.io.to(`room:${roomId}`).emit('message:new', message)
    return reply.code(201).send(message)
  })

  // Edit message
  app.put('/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const { content } = req.body
    if (!content || content.length > MAX_CONTENT) {
      return reply.code(400).send({ error: 'Invalid content' })
    }

    const message = await app.db.message.findUnique({ where: { id: req.params.id } })
    if (!message || message.deletedAt) return reply.code(404).send({ error: 'Not found' })
    if (message.authorId !== req.user.id) return reply.code(403).send({ error: 'Forbidden' })

    const updated = await app.db.message.update({
      where: { id: message.id },
      data: { content, editedAt: new Date() },
      include: { author: { select: { id: true, username: true } }, attachments: true },
    })

    app.io.to(`room:${message.roomId}`).emit('message:updated', updated)
    return updated
  })

  // Delete message
  app.delete('/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const message = await app.db.message.findUnique({ where: { id: req.params.id } })
    if (!message || message.deletedAt) return reply.code(404).send({ error: 'Not found' })

    const isAuthor = message.authorId === req.user.id
    if (!isAuthor) {
      const member = await app.db.roomMember.findUnique({
        where: { roomId_userId: { roomId: message.roomId, userId: req.user.id } },
      })
      if (!member || member.role !== 'ADMIN') return reply.code(403).send({ error: 'Forbidden' })
    }

    await app.db.message.update({
      where: { id: message.id },
      data: { deletedAt: new Date() },
    })

    app.io.to(`room:${message.roomId}`).emit('message:deleted', { id: message.id, roomId: message.roomId })
    return { ok: true }
  })
}
