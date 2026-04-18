const AFK_MS = 60_000

// userId -> Map<socketId, timeoutHandle>
const sockets = new Map()

function connect(userId, socketId) {
  if (!sockets.has(userId)) sockets.set(userId, new Map())
  const timer = setTimeout(() => {}, AFK_MS)
  clearTimeout(timer)
  sockets.get(userId).set(socketId, null)
}

function activity(userId, socketId, onAfk) {
  const userSockets = sockets.get(userId)
  if (!userSockets) return

  const existing = userSockets.get(socketId)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    userSockets.set(socketId, null)
    const allAfk = [...userSockets.values()].every(t => t === null)
    if (allAfk) onAfk()
  }, AFK_MS)

  userSockets.set(socketId, timer)
}

function disconnect(userId, socketId) {
  const userSockets = sockets.get(userId)
  if (!userSockets) return 'offline'

  const timer = userSockets.get(socketId)
  if (timer) clearTimeout(timer)
  userSockets.delete(socketId)

  if (userSockets.size === 0) {
    sockets.delete(userId)
    return 'offline'
  }
  return 'online'
}

function getStatus(userId) {
  const userSockets = sockets.get(userId)
  if (!userSockets || userSockets.size === 0) return 'offline'
  const hasActive = [...userSockets.values()].some(t => t !== null)
  return hasActive ? 'online' : 'afk'
}

export default { connect, activity, disconnect, getStatus }
