import { createWriteStream, createReadStream, mkdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { pipeline } from 'stream/promises'

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'
const IMAGE_MAX = 3 * 1024 * 1024
const FILE_MAX = 20 * 1024 * 1024

export default async function filesRoutes(app) {
  // Upload attachment for a message
  app.post('/upload/:roomId', { preHandler: app.authenticate }, async (req, reply) => {
    const { roomId } = req.params

    const member = await app.db.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: req.user.id } },
    })
    if (!member) return reply.code(403).send({ error: 'Not a member' })

    const parts = req.parts()
    const attachments = []
    let messageContent = ''
    const comments = [] // ordered list of comment fields matching file order

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'content') { messageContent = part.value; continue }
        if (part.fieldname === 'comment') { comments.push(part.value || ''); continue }
        continue
      }
      if (part.type === 'file') {
        const isImage = part.mimetype.startsWith('image/')
        const maxSize = isImage ? IMAGE_MAX : FILE_MAX

        const ext = extname(part.filename) || ''
        const storedName = `${uuidv4()}${ext}`
        const dir = join(UPLOADS_DIR, roomId)
        mkdirSync(dir, { recursive: true })
        const filePath = join(dir, storedName)

        let size = 0
        const chunks = []
        for await (const chunk of part.file) {
          size += chunk.length
          if (size > maxSize) {
            return reply.code(413).send({ error: `File too large (max ${maxSize / 1024 / 1024}MB)` })
          }
          chunks.push(chunk)
        }

        const ws = createWriteStream(filePath)
        await pipeline(async function* () { for (const c of chunks) yield c }, ws)

        attachments.push({
          originalName: part.filename,
          storagePath: join(roomId, storedName),
          mimeType: part.mimetype,
          size,
          commentIndex: attachments.length,
        })
      }
    }

    // Attach comments by index after streaming completes
    for (const a of attachments) {
      a.comment = comments[a.commentIndex] || null
      delete a.commentIndex
    }

    if (attachments.length === 0) return reply.code(400).send({ error: 'No file provided' })

    const message = await app.db.message.create({
      data: {
        roomId,
        authorId: req.user.id,
        content: messageContent || '',
        attachments: { create: attachments },
      },
      include: {
        author: { select: { id: true, username: true } },
        attachments: true,
      },
    })

    app.io.to(`room:${roomId}`).emit('message:new', message)
    return reply.code(201).send(message)
  })

  // Download file — auth check via session cookie
  app.get('/:attachmentId', { preHandler: app.authenticate }, async (req, reply) => {
    const attachment = await app.db.attachment.findUnique({
      where: { id: req.params.attachmentId },
      include: { message: { select: { roomId: true } } },
    })
    if (!attachment) return reply.code(404).send({ error: 'Not found' })

    const member = await app.db.roomMember.findUnique({
      where: { roomId_userId: { roomId: attachment.message.roomId, userId: req.user.id } },
    })
    if (!member) return reply.code(403).send({ error: 'Access denied' })

    const filePath = join(UPLOADS_DIR, attachment.storagePath)
    let stat
    try { stat = statSync(filePath) } catch { return reply.code(404).send({ error: 'File not found' }) }

    reply.header('Content-Type', attachment.mimeType)
    reply.header('Content-Length', stat.size)
    reply.header('Content-Disposition', `inline; filename="${attachment.originalName}"`)
    return reply.send(createReadStream(filePath))
  })
}
