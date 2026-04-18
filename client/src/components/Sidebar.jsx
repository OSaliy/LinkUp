import { useEffect, useState } from 'react'
import { useChatStore } from '../store/chat'
import { useAuthStore } from '../store/auth'
import api from '../api'

export default function Sidebar() {
  const { rooms, loadRooms, setActiveRoom, activeRoomId, unread } = useChatStore()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => { loadRooms() }, [])

  const publicRooms = rooms.filter(r => r.visibility === 'PUBLIC')
  const privateRooms = rooms.filter(r => r.visibility === 'PRIVATE')
  const dms = rooms.filter(r => r.visibility === 'DIRECT')

  const createRoom = async () => {
    const name = prompt('Room name:')
    if (!name) return
    const visibility = confirm('Public room? (Cancel = Private)') ? 'PUBLIC' : 'PRIVATE'
    await api.post('/rooms', { name, visibility })
    loadRooms()
  }

  return (
    <div className={`flex flex-col bg-gray-800 border-r border-gray-700 transition-all ${collapsed ? 'w-14' : 'w-64'}`}>
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        {!collapsed && <span className="font-bold text-lg">LynkUp</span>}
        <button onClick={() => setCollapsed(c => !c)} className="text-gray-400 hover:text-white text-xl">
          {collapsed ? '»' : '«'}
        </button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          <RoomGroup label="Public Rooms" rooms={publicRooms} active={activeRoomId} unread={unread} onSelect={setActiveRoom} />
          <RoomGroup label="Private Rooms" rooms={privateRooms} active={activeRoomId} unread={unread} onSelect={setActiveRoom} />
          <RoomGroup label="Direct Messages" rooms={dms} active={activeRoomId} unread={unread} onSelect={setActiveRoom} isDm />
        </div>
      )}

      {!collapsed && (
        <div className="p-3 border-t border-gray-700 space-y-2">
          <button onClick={createRoom}
            className="w-full text-sm bg-indigo-600 hover:bg-indigo-500 py-1.5 rounded">
            + Create Room
          </button>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span className="truncate">{user?.username}</span>
            <button onClick={logout} className="hover:text-white ml-2 shrink-0">Sign out</button>
          </div>
        </div>
      )}
    </div>
  )
}

function RoomGroup({ label, rooms, active, unread, onSelect, isDm }) {
  const [open, setOpen] = useState(true)
  if (rooms.length === 0) return null
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="w-full text-left text-xs font-semibold uppercase text-gray-400 hover:text-white px-1 py-1 flex justify-between">
        {label} <span>{open ? '▼' : '▶'}</span>
      </button>
      {open && rooms.map(r => (
        <button key={r.id} onClick={() => onSelect(r.id)}
          className={`w-full text-left px-2 py-1 rounded text-sm flex justify-between items-center hover:bg-gray-700
            ${active === r.id ? 'bg-gray-700 text-white' : 'text-gray-300'}`}>
          <span className="truncate">{isDm ? r.name.replace('dm:', '').replace(':', ' / ') : `# ${r.name}`}</span>
          {unread[r.id] > 0 && (
            <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 ml-1 shrink-0">
              {unread[r.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
