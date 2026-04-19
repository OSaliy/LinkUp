import { useEffect, useState } from 'react'
import { useChatStore } from '../store/chat'
import { useAuthStore } from '../store/auth'
import { ConfirmDialog } from './Modal'
import api from '../api'

function AddFriendButton({ userId, username }) {
  const [status, setStatus] = useState(null) // null | 'sent' | 'error' | 'already'
  const send = async () => {
    try {
      await api.post('/contacts/requests', { username })
      setStatus('sent')
    } catch (err) {
      const msg = err.response?.data?.error || ''
      setStatus(msg.includes('exists') || msg.includes('already') ? 'already' : 'error')
    }
  }
  if (status === 'sent') return <span className="text-xs text-green-400">Sent!</span>
  if (status === 'already') return <span className="text-xs text-gray-500">Friends</span>
  if (status === 'error') return <span className="text-xs text-red-400">Failed</span>
  return (
    <button onClick={send} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors" title="Add friend">
      + Friend
    </button>
  )
}

const STATUS_COLOR = {
  online: 'bg-green-400',
  afk: 'bg-yellow-400',
  offline: 'bg-gray-600',
}
const STATUS_LABEL = { online: 'Online', afk: 'Away', offline: 'Offline' }

export default function MemberList({ roomId, room }) {
  const { members, presence, loadMembers } = useChatStore()
  const currentUser = useAuthStore(s => s.user)
  const roomMembers = members[roomId] || []
  const [menuUserId, setMenuUserId] = useState(null)
  const [kicking, setKicking] = useState(null)

  useEffect(() => { loadMembers(roomId) }, [roomId])

  const myMembership = roomMembers.find(m => m.userId === currentUser?.id)
  const isAdmin = myMembership?.role === 'ADMIN'
  const isOwner = room?.ownerId === currentUser?.id

  const sorted = [...roomMembers].sort((a, b) => {
    const order = { online: 0, afk: 1, offline: 2 }
    return (order[presence[a.userId]] ?? 2) - (order[presence[b.userId]] ?? 2)
  })

  const groups = [
    { label: 'Online', members: sorted.filter(m => presence[m.userId] === 'online') },
    { label: 'Away', members: sorted.filter(m => presence[m.userId] === 'afk') },
    { label: 'Offline', members: sorted.filter(m => !presence[m.userId] || presence[m.userId] === 'offline') },
  ].filter(g => g.members.length > 0)

  const kickMember = async () => {
    await api.delete(`/rooms/${roomId}/members/${kicking.userId}`)
    loadMembers(roomId)
    setKicking(null)
  }

  const promoteAdmin = async (userId) => {
    setMenuUserId(null)
    await api.post(`/rooms/${roomId}/admins/${userId}`)
    loadMembers(roomId)
  }

  const demoteAdmin = async (userId) => {
    setMenuUserId(null)
    await api.delete(`/rooms/${roomId}/admins/${userId}`)
    loadMembers(roomId)
  }

  return (
    <>
      <div
        className="w-52 bg-gray-900 border-l border-gray-700/50 flex flex-col overflow-hidden flex-shrink-0"
        onClick={() => setMenuUserId(null)}
      >
        <div className="px-3 py-2.5 border-b border-gray-700/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Members — {roomMembers.length}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {groups.map(({ label, members: gm }) => (
            <div key={label} className="mb-3">
              <p className="text-xs text-gray-600 uppercase font-semibold px-3 mb-1">{label} — {gm.length}</p>
              {gm.map(m => {
                const status = presence[m.userId] || 'offline'
                const isTargetOwner = m.userId === room?.ownerId
                const canManage = (isAdmin || isOwner) && m.userId !== currentUser?.id && !isTargetOwner

                return (
                  <div key={m.id} className="relative px-2">
                    <div
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg group transition-colors ${canManage ? 'cursor-pointer hover:bg-gray-800' : 'hover:bg-gray-800/50'}`}
                      onClick={e => { e.stopPropagation(); canManage && setMenuUserId(menuUserId === m.userId ? null : m.userId) }}
                    >
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 rounded-full bg-indigo-800 flex items-center justify-center text-xs font-bold">
                          {m.user.username[0].toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${STATUS_COLOR[status]}`} title={STATUS_LABEL[status]} />
                      </div>
                      <span className="text-sm truncate text-gray-300 flex-1">{m.user.username}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {m.userId === room?.ownerId && <span className="text-amber-500 text-xs" title="Owner">★</span>}
                        {m.role === 'ADMIN' && m.userId !== room?.ownerId && <span className="text-indigo-400 text-xs" title="Admin">A</span>}
                        {m.userId !== currentUser?.id && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <AddFriendButton userId={m.userId} username={m.user.username} />
                          </span>
                        )}
                        {canManage && <span className="text-gray-600 text-xs opacity-0 group-hover:opacity-100">⋮</span>}
                      </div>
                    </div>

                    {menuUserId === m.userId && canManage && (
                      <div
                        className="absolute right-0 top-9 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-30 py-1 w-40 overflow-hidden"
                        style={{ right: '100%', marginRight: '4px', top: '0' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {isOwner && (
                          m.role === 'ADMIN'
                            ? <button onClick={() => demoteAdmin(m.userId)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-yellow-400 transition-colors">Remove admin</button>
                            : <button onClick={() => promoteAdmin(m.userId)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-green-400 transition-colors">Make admin</button>
                        )}
                        <button
                          onClick={() => { setMenuUserId(null); setKicking(m) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-red-400 transition-colors"
                        >
                          Ban from room
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {kicking && (
        <ConfirmDialog
          title="Ban member"
          message={`Ban @${kicking.user.username} from this room? They won't be able to rejoin unless unbanned.`}
          confirmLabel="Ban"
          onConfirm={kickMember}
          onCancel={() => setKicking(null)}
        />
      )}
    </>
  )
}
