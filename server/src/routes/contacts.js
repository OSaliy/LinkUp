export default async function contactsRoutes(app) {
  // List friends
  app.get('/', { preHandler: app.authenticate }, async (req) => {
    const userId = req.user.id
    const friendships = await app.db.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, username: true } },
        addressee: { select: { id: true, username: true } },
      },
    })
    return friendships.map(f => f.requesterId === userId ? f.addressee : f.requester)
  })

  // Pending requests (received)
  app.get('/requests', { preHandler: app.authenticate }, async (req) => {
    return app.db.friendship.findMany({
      where: { addresseeId: req.user.id, status: 'PENDING' },
      include: { requester: { select: { id: true, username: true } } },
    })
  })

  // Send friend request
  app.post('/requests', { preHandler: app.authenticate }, async (req, reply) => {
    const { username, message } = req.body
    const addressee = await app.db.user.findUnique({ where: { username } })
    if (!addressee) return reply.code(404).send({ error: 'User not found' })
    if (addressee.id === req.user.id) return reply.code(400).send({ error: 'Cannot friend yourself' })

    const ban = await app.db.userBan.findFirst({
      where: {
        OR: [
          { bannerId: addressee.id, bannedId: req.user.id },
          { bannerId: req.user.id, bannedId: addressee.id },
        ],
      },
    })
    if (ban) return reply.code(403).send({ error: 'Cannot send request' })

    const existing = await app.db.friendship.findFirst({
      where: {
        OR: [
          { requesterId: req.user.id, addresseeId: addressee.id },
          { requesterId: addressee.id, addresseeId: req.user.id },
        ],
      },
    })
    if (existing) return reply.code(409).send({ error: 'Request already exists' })

    const friendship = await app.db.friendship.create({
      data: { requesterId: req.user.id, addresseeId: addressee.id, message },
    })
    app.io.to(`user:${addressee.id}`).emit('friend:request', {
      id: friendship.id,
      from: req.user.username,
    })
    return reply.code(201).send(friendship)
  })

  // Accept request
  app.put('/requests/:id/accept', { preHandler: app.authenticate }, async (req, reply) => {
    const friendship = await app.db.friendship.findUnique({ where: { id: req.params.id } })
    if (!friendship || friendship.addresseeId !== req.user.id) {
      return reply.code(404).send({ error: 'Not found' })
    }
    const updated = await app.db.friendship.update({
      where: { id: friendship.id },
      data: { status: 'ACCEPTED' },
    })
    app.io.to(`user:${friendship.requesterId}`).emit('friend:accepted', { userId: req.user.id })
    return updated
  })

  // Decline / remove friend
  app.delete('/requests/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const friendship = await app.db.friendship.findUnique({ where: { id: req.params.id } })
    if (!friendship) return reply.code(404).send({ error: 'Not found' })
    const userId = req.user.id
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      return reply.code(403).send({ error: 'Forbidden' })
    }
    await app.db.friendship.delete({ where: { id: friendship.id } })
    return { ok: true }
  })

  // Ban user
  app.post('/bans', { preHandler: app.authenticate }, async (req, reply) => {
    const { userId } = req.body
    if (userId === req.user.id) return reply.code(400).send({ error: 'Cannot ban yourself' })

    await app.db.$transaction(async (tx) => {
      await tx.userBan.upsert({
        where: { bannerId_bannedId: { bannerId: req.user.id, bannedId: userId } },
        create: { bannerId: req.user.id, bannedId: userId },
        update: {},
      })
      // Remove friendship
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { requesterId: req.user.id, addresseeId: userId },
            { requesterId: userId, addresseeId: req.user.id },
          ],
        },
      })
      // Lock direct room between the two
      const directRooms = await tx.room.findMany({
        where: {
          visibility: 'DIRECT',
          members: { every: { userId: { in: [req.user.id, userId] } } },
        },
      })
      if (directRooms.length > 0) {
        await tx.room.update({
          where: { id: directRooms[0].id },
          data: { lockedAt: new Date() },
        })
      }
    })
    return { ok: true }
  })

  // Unban user
  app.delete('/bans/:userId', { preHandler: app.authenticate }, async (req) => {
    await app.db.userBan.deleteMany({
      where: { bannerId: req.user.id, bannedId: req.params.userId },
    })
    return { ok: true }
  })

  // Open or get DM room with a friend
  app.post('/dm/:userId', { preHandler: app.authenticate }, async (req, reply) => {
    const otherId = req.params.userId
    const userId = req.user.id

    const ban = await app.db.userBan.findFirst({
      where: {
        OR: [
          { bannerId: userId, bannedId: otherId },
          { bannerId: otherId, bannedId: userId },
        ],
      },
    })
    if (ban) return reply.code(403).send({ error: 'Cannot message this user' })

    const friendship = await app.db.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, addresseeId: otherId },
          { requesterId: otherId, addresseeId: userId },
        ],
      },
    })
    if (!friendship) return reply.code(403).send({ error: 'Must be friends first' })

    // Find existing DM room
    const existing = await app.db.room.findFirst({
      where: {
        visibility: 'DIRECT',
        deletedAt: null,
        members: { every: { userId: { in: [userId, otherId] } } },
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: otherId } } },
        ],
      },
    })
    if (existing) return existing

    const other = await app.db.user.findUnique({ where: { id: otherId }, select: { username: true } })
    const me = await app.db.user.findUnique({ where: { id: userId }, select: { username: true } })

    const room = await app.db.room.create({
      data: {
        name: `dm:${[me.username, other.username].sort().join(':')}`,
        visibility: 'DIRECT',
        members: {
          create: [{ userId }, { userId: otherId }],
        },
      },
    })
    return reply.code(201).send(room)
  })
}
