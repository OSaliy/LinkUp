import { rmSync } from 'fs'
import { join } from 'path'

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'

export default async function roomsRoutes(app) {
  // List public rooms
  app.get('/', { preHandler: app.authenticate }, async (req) => {
    const { q } = req.query
    return app.db.room.findMany({
      where: {
        visibility: 'PUBLIC',
        deletedAt: null,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      select: {
        id: true, name: true, description: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    })
  })

  // My rooms
  app.get('/mine', { preHandler: app.authenticate }, async (req) => {
    const memberships = await app.db.roomMember.findMany({
      where: { userId: req.user.id },
      include: {
        room: {
          select: { id: true, name: true, description: true, visibility: true, ownerId: true, lockedAt: true, deletedAt: true },
        },
      },
    })
    return memberships
      .filter(m => !m.room.deletedAt)
      .map(m => {
        const { deletedAt: _d, ...room } = m.room
        return { ...room, role: m.role }
      })
  })

  // Get room
  app.get('/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await getRoomOrFail(app, req.params.id, req.user.id, reply)
    if (!room) return
    return room
  })

  // Create room
  app.post('/', { preHandler: app.authenticate }, async (req, reply) => {
    const { name, description, visibility = 'PUBLIC' } = req.body
    if (!name) return reply.code(400).send({ error: 'name required' })

    const existing = await app.db.room.findUnique({ where: { name } })
    if (existing) return reply.code(409).send({ error: 'Room name taken' })

    const room = await app.db.room.create({
      data: {
        name, description, visibility,
        ownerId: req.user.id,
        members: { create: { userId: req.user.id, role: 'ADMIN' } },
      },
    })
    app.io.to(`room:${room.id}`).emit('room:updated', room)
    return reply.code(201).send(room)
  })

  // Update room settings
  app.put('/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await getAdminRoom(app, req.params.id, req.user.id, reply)
    if (!room) return
    if (room.ownerId !== req.user.id) return reply.code(403).send({ error: 'Owner only' })

    const { name, description, visibility } = req.body
    if (name && name !== room.name) {
      const existing = await app.db.room.findUnique({ where: { name } })
      if (existing) return reply.code(409).send({ error: 'Room name taken' })
    }

    const updated = await app.db.room.update({
      where: { id: room.id },
      data: { name, description, visibility },
    })
    app.io.to(`room:${room.id}`).emit('room:updated', updated)
    return updated
  })

  // Delete room
  app.delete('/:id', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await app.db.room.findUnique({ where: { id: req.params.id } })
    if (!room || room.deletedAt) return reply.code(404).send({ error: 'Not found' })
    if (room.ownerId !== req.user.id) return reply.code(403).send({ error: 'Owner only' })

    await app.db.room.update({ where: { id: room.id }, data: { deletedAt: new Date() } })
    app.io.to(`room:${room.id}`).emit('room:deleted', { roomId: room.id })

    // Delete room's upload directory from disk (best-effort)
    try { rmSync(join(UPLOADS_DIR, room.id), { recursive: true, force: true }) } catch {}

    return { ok: true }
  })

  // Join room
  app.post('/:id/join', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await app.db.room.findUnique({ where: { id: req.params.id } })
    if (!room || room.deletedAt) return reply.code(404).send({ error: 'Not found' })
    if (room.visibility !== 'PUBLIC') return reply.code(403).send({ error: 'Private room' })

    const ban = await app.db.roomBan.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: req.user.id } },
    })
    if (ban) return reply.code(403).send({ error: 'Banned from this room' })

    await app.db.roomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId: req.user.id } },
      create: { roomId: room.id, userId: req.user.id },
      update: {},
    })
    app.io.to(`room:${room.id}`).emit('room:member_joined', { roomId: room.id, userId: req.user.id })
    return { ok: true }
  })

  // Leave room
  app.post('/:id/leave', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await app.db.room.findUnique({ where: { id: req.params.id } })
    if (!room || room.deletedAt) return reply.code(404).send({ error: 'Not found' })
    if (room.ownerId === req.user.id) return reply.code(400).send({ error: 'Owner cannot leave — delete the room' })

    await app.db.roomMember.deleteMany({
      where: { roomId: room.id, userId: req.user.id },
    })
    app.io.to(`room:${room.id}`).emit('room:member_left', { roomId: room.id, userId: req.user.id })
    return { ok: true }
  })

  // Get members
  app.get('/:id/members', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await getRoomOrFail(app, req.params.id, req.user.id, reply)
    if (!room) return
    return app.db.roomMember.findMany({
      where: { roomId: room.id },
      include: { user: { select: { id: true, username: true } } },
    })
  })

  // Make admin
  app.post('/:id/admins/:userId', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await getAdminRoom(app, req.params.id, req.user.id, reply)
    if (!room) return
    await app.db.roomMember.update({
      where: { roomId_userId: { roomId: room.id, userId: req.params.userId } },
      data: { role: 'ADMIN' },
    })
    app.io.to(`room:${room.id}`).emit('room:role_changed', { roomId: room.id, userId: req.params.userId, role: 'ADMIN' })
    return { ok: true }
  })

  // Remove admin
  app.delete('/:id/admins/:userId', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await getAdminRoom(app, req.params.id, req.user.id, reply)
    if (!room) return
    if (req.params.userId === room.ownerId) return reply.code(403).send({ error: 'Cannot remove owner admin' })
    await app.db.roomMember.update({
      where: { roomId_userId: { roomId: room.id, userId: req.params.userId } },
      data: { role: 'MEMBER' },
    })
    app.io.to(`room:${room.id}`).emit('room:role_changed', { roomId: room.id, userId: req.params.userId, role: 'MEMBER' })
    return { ok: true }
  })

  // Ban/remove member (ban on remove)
  app.delete('/:id/members/:userId', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await getAdminRoom(app, req.params.id, req.user.id, reply)
    if (!room) return
    if (req.params.userId === room.ownerId) return reply.code(403).send({ error: 'Cannot remove owner' })

    await app.db.$transaction([
      app.db.roomMember.deleteMany({
        where: { roomId: room.id, userId: req.params.userId },
      }),
      app.db.roomBan.upsert({
        where: { roomId_userId: { roomId: room.id, userId: req.params.userId } },
        create: { roomId: room.id, userId: req.params.userId, bannedById: req.user.id },
        update: { bannedById: req.user.id },
      }),
    ])
    app.io.to(`room:${room.id}`).emit('room:member_banned', { roomId: room.id, userId: req.params.userId })
    return { ok: true }
  })

  // Get ban list
  app.get('/:id/bans', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await getAdminRoom(app, req.params.id, req.user.id, reply)
    if (!room) return
    return app.db.roomBan.findMany({
      where: { roomId: room.id },
      include: {
        user: { select: { id: true, username: true } },
        bannedBy: { select: { id: true, username: true } },
      },
    })
  })

  // Unban
  app.delete('/:id/bans/:userId', { preHandler: app.authenticate }, async (req, reply) => {
    const room = await getAdminRoom(app, req.params.id, req.user.id, reply)
    if (!room) return
    await app.db.roomBan.deleteMany({
      where: { roomId: room.id, userId: req.params.userId },
    })
    return { ok: true }
  })

  // List pending invitations for current user
  app.get('/invitations/pending', { preHandler: app.authenticate }, async (req) => {
    return app.db.roomInvitation.findMany({
      where: { inviteeId: req.user.id },
      include: {
        room: { select: { id: true, name: true, description: true } },
        inviter: { select: { id: true, username: true } },
      },
    })
  })

  // Decline invitation
  app.delete('/:id/invitations', { preHandler: app.authenticate }, async (req, reply) => {
    await app.db.roomInvitation.deleteMany({
      where: { roomId: req.params.id, inviteeId: req.user.id },
    })
    return { ok: true }
  })

  // Invite to private room
  app.post('/:id/invitations', { preHandler: app.authenticate }, async (req, reply) => {
    const { username } = req.body
    const room = await getRoomOrFail(app, req.params.id, req.user.id, reply)
    if (!room) return

    const invitee = await app.db.user.findUnique({ where: { username } })
    if (!invitee) return reply.code(404).send({ error: 'User not found' })

    await app.db.roomInvitation.upsert({
      where: { roomId_inviteeId: { roomId: room.id, inviteeId: invitee.id } },
      create: { roomId: room.id, inviterId: req.user.id, inviteeId: invitee.id },
      update: {},
    })
    app.io.to(`user:${invitee.id}`).emit('room:invited', { roomId: room.id, roomName: room.name, invitedBy: req.user.username })
    return { ok: true }
  })

  // Accept invitation
  app.post('/:id/invitations/accept', { preHandler: app.authenticate }, async (req, reply) => {
    const invite = await app.db.roomInvitation.findUnique({
      where: { roomId_inviteeId: { roomId: req.params.id, inviteeId: req.user.id } },
    })
    if (!invite) return reply.code(404).send({ error: 'No invitation' })

    await app.db.$transaction([
      app.db.roomMember.upsert({
        where: { roomId_userId: { roomId: invite.roomId, userId: req.user.id } },
        create: { roomId: invite.roomId, userId: req.user.id },
        update: {},
      }),
      app.db.roomInvitation.delete({ where: { id: invite.id } }),
    ])
    return { ok: true }
  })
}

async function getRoomOrFail(app, roomId, userId, reply) {
  const room = await app.db.room.findUnique({ where: { id: roomId } })
  if (!room || room.deletedAt) { reply.code(404).send({ error: 'Not found' }); return null }

  if (room.visibility === 'PRIVATE' || room.visibility === 'DIRECT') {
    const member = await app.db.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    })
    if (!member) { reply.code(403).send({ error: 'Not a member' }); return null }
  }
  return room
}

async function getAdminRoom(app, roomId, userId, reply) {
  const room = await app.db.room.findUnique({ where: { id: roomId } })
  if (!room || room.deletedAt) { reply.code(404).send({ error: 'Not found' }); return null }

  const member = await app.db.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  })
  if (!member || member.role !== 'ADMIN') {
    reply.code(403).send({ error: 'Admin only' }); return null
  }
  return room
}
