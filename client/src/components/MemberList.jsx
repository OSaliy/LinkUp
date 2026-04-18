import { useEffect } from 'react'
import { useChatStore } from '../store/chat'

const STATUS_DOT = {
  online: 'bg-green-400',
  afk: 'bg-yellow-400',
  offline: 'bg-gray-500',
}

export default function MemberList({ roomId }) {
  const { members, presence, loadMembers } = useChatStore()
  const roomMembers = members[roomId] || []

  useEffect(() => { loadMembers(roomId) }, [roomId])

  const sorted = [...roomMembers].sort((a, b) => {
    const order = { online: 0, afk: 1, offline: 2 }
    return (order[presence[a.userId]] ?? 2) - (order[presence[b.userId]] ?? 2)
  })

  return (
    <div className="w-52 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-700 text-sm font-semibold text-gray-400">
        Members ({roomMembers.length})
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sorted.map(m => {
          const status = presence[m.userId] || 'offline'
          return (
            <div key={m.id} className="flex items-center gap-2 px-1 py-0.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
              <span className="text-sm truncate text-gray-300">{m.user.username}</span>
              {m.role === 'ADMIN' && (
                <span className="text-xs text-indigo-400 shrink-0">A</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
