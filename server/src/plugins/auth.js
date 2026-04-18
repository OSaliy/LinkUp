import fp from 'fastify-plugin'

export default fp(async (app) => {
  app.decorateRequest('user', null)

  app.decorate('authenticate', async (req, reply) => {
    const token = req.cookies?.session
    if (!token) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const session = await app.db.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || session.user.deletedAt) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    req.user = session.user
    req.sessionId = session.id

    await app.db.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    })
  })
})
