export default async function usersRoutes(app) {
  app.get('/search', { preHandler: app.authenticate }, async (req) => {
    const { q } = req.query
    if (!q) return []
    return app.db.user.findMany({
      where: {
        username: { contains: q, mode: 'insensitive' },
        deletedAt: null,
        NOT: { id: req.user.id },
      },
      select: { id: true, username: true },
      take: 20,
    })
  })

  app.get('/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const user = await app.db.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, username: true, createdAt: true },
    })
    if (!user) return reply.code(404).send({ error: 'Not found' })
    return user
  })

  app.delete('/me', { preHandler: app.authenticate }, async (req, reply) => {
    const userId = req.user.id

    const ownedRooms = await app.db.room.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true },
    })

    await app.db.$transaction([
      ...ownedRooms.map(r => app.db.room.update({
        where: { id: r.id },
        data: { deletedAt: new Date() },
      })),
      app.db.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() },
      }),
    ])

    reply.clearCookie('session', { path: '/' })
    return { ok: true }
  })
}
