import { useEffect, useState } from 'react'
import { useChatStore } from '../store/chat'
import { useAuthStore } from '../store/auth'
import api from '../api'
import RoomModal from './RoomModal'
import FriendsPanel from './FriendsPanel'
import UserMenu from './UserMenu'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'

export default function Sidebar({ onRoomSelect }) {
  const { rooms, loadRooms, setActiveRoom, activeRoomId, unread } = useChatStore()
  const { user } = useAuthStore()
  const [showBrowse, setShowBrowse] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [managingRoom, setManagingRoom] = useState(null)
  const [friendRequestCount, setFriendRequestCount] = useState(0)

  const refreshFriendCount = () =>
    api.get('/contacts/requests').then(r => setFriendRequestCount(r.data.length)).catch(() => {})

  useEffect(() => {
    loadRooms()
    refreshFriendCount()
  }, [])

  const publicRooms = rooms.filter(r => r.visibility === 'PUBLIC')
  const privateRooms = rooms.filter(r => r.visibility === 'PRIVATE')
  const dms = rooms.filter(r => r.visibility === 'DIRECT')
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)

  return (
    <>
      <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-700/50 flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-700/50">
          <span className="font-bold text-base tracking-tight text-white">LinkUp</span>
          {totalUnread > 0 && (
            <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 min-w-[20px] text-center py-0.5">{totalUnread > 99 ? '99+' : totalUnread}</span>
          )}
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1">
          {publicRooms.length > 0 && (
            <RoomGroup label="Channels" rooms={publicRooms} active={activeRoomId} unread={unread} onSelect={id => { setActiveRoom(id); onRoomSelect?.() }} onManage={setManagingRoom} />
          )}
          {privateRooms.length > 0 && (
            <RoomGroup label="Private" rooms={privateRooms} active={activeRoomId} unread={unread} onSelect={id => { setActiveRoom(id); onRoomSelect?.() }} onManage={setManagingRoom} />
          )}
          {dms.length > 0 && (
            <RoomGroup label="Direct Messages" rooms={dms} active={activeRoomId} unread={unread} onSelect={id => { setActiveRoom(id); onRoomSelect?.() }} />
          )}
          {rooms.length === 0 && (
            <div className="px-4 py-8 text-center space-y-1">
              <p className="text-2xl">🏠</p>
              <p className="text-xs text-gray-500">No rooms yet</p>
              <p className="text-xs text-gray-600">Browse or create one below</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3 border-t border-gray-700/50 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowBrowse(true)}
              className="flex-1 text-xs bg-gray-700/80 hover:bg-gray-700 py-2 rounded-lg transition-colors text-gray-300 font-medium"
            >
              Browse
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 text-xs bg-indigo-700 hover:bg-indigo-600 py-2 rounded-lg transition-colors font-medium"
            >
              + Create
            </button>
          </div>
          <button
            onClick={() => setShowFriends(true)}
            className="w-full text-xs bg-gray-700/80 hover:bg-gray-700 py-2 rounded-lg transition-colors text-gray-300 font-medium flex items-center justify-center gap-1.5"
          >
            Friends & DMs
            {friendRequestCount > 0 && (
              <span className="bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{friendRequestCount}</span>
            )}
          </button>

          {/* User row */}
          <button
            onClick={() => setShowUserMenu(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-700/80 transition-colors group"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs text-gray-300 truncate font-medium">{user?.username}</p>
              <p className="text-xs text-green-400">Online</p>
            </div>
            <span className="text-gray-600 group-hover:text-gray-400 text-xs">⚙</span>
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setShowCreate(false); loadRooms().then(() => setActiveRoom(id)) }}
        />
      )}
      {showBrowse && (
        <BrowseRoomsModal
          onClose={() => { setShowBrowse(false); loadRooms() }}
          onJoined={(id) => { setShowBrowse(false); loadRooms().then(() => setActiveRoom(id)) }}
        />
      )}
      {showFriends && (
        <FriendsPanel onClose={() => { setShowFriends(false); refreshFriendCount() }} />
      )}
      {showUserMenu && user && (
        <UserMenu user={user} onClose={() => setShowUserMenu(false)} />
      )}
      {managingRoom && (
        <RoomModal room={managingRoom} currentUserId={user?.id} onClose={() => setManagingRoom(null)} />
      )}
    </>
  )
}

function RoomGroup({ label, rooms, active, unread, onSelect, onManage }) {
  const [open, setOpen] = useState(true)
  const isDm = label === 'Direct Messages'
  return (
    <div className="px-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left text-xs font-semibold uppercase text-gray-500 hover:text-gray-400 px-2 py-1.5 flex justify-between items-center transition-colors"
      >
        {label}
        <span className="text-gray-600">{open ? '▾' : '▸'}</span>
      </button>
      {open && rooms.map(r => {
        const name = isDm ? r.name.replace('dm:', '').replace(':', ' / ') : `# ${r.name}`
        const hasUnread = unread[r.id] > 0
        return (
          <div key={r.id} className="flex items-center group rounded-lg">
            <button
              onClick={() => onSelect(r.id)}
              className={`flex-1 text-left px-2 py-1.5 rounded-lg text-sm flex items-center justify-between min-w-0 transition-colors
                ${active === r.id
                  ? 'bg-gray-700 text-white'
                  : hasUnread
                    ? 'text-white hover:bg-gray-800'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
            >
              <span className={`truncate ${hasUnread ? 'font-semibold' : ''}`}>{name}</span>
              {hasUnread && (
                <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 min-w-[20px] text-center leading-4 ml-1 shrink-0">
                  {unread[r.id] > 99 ? '99+' : unread[r.id]}
                </span>
              )}
            </button>
            {!isDm && onManage && (
              <button
                onClick={() => onManage(r)}
                className="px-1.5 py-1.5 text-gray-700 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-gray-700"
                title="Manage room"
              >
                ⚙
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CreateRoomModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [visibility, setVisibility] = useState('PUBLIC')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return
    setLoading(true)
    try {
      const { data } = await api.post('/rooms', { name: name.trim(), description: description.trim() || undefined, visibility })
      onCreated(data.id)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room')
      setLoading(false)
    }
  }

  return (
    <Modal onClose={onClose} width="max-w-sm">
      <ModalHeader title="Create Room" onClose={onClose} />
      <form onSubmit={submit}>
        <ModalBody className="space-y-3">
          {error && <p className="text-sm text-red-400 bg-red-900/20 rounded px-3 py-2">{error}</p>}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Room name *</label>
            <input
              autoFocus
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-500"
              placeholder="e.g. general"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Description</label>
            <input
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-500"
              placeholder="Optional"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-2">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              {['PUBLIC', 'PRIVATE'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    visibility === v
                      ? 'bg-indigo-700 border-indigo-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {v === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              {visibility === 'PUBLIC' ? 'Anyone can find and join this room.' : 'Invite-only. Not shown in the catalog.'}
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading || !name.trim()} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors">
            {loading ? 'Creating…' : 'Create room'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

function BrowseRoomsModal({ onClose, onJoined }) {
  const [q, setQ] = useState('')
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const myRooms = useChatStore(s => s.rooms)
  const myRoomIds = new Set(myRooms.map(r => r.id))

  const search = async (query) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/rooms', { params: query ? { q: query } : {} })
      setRooms(data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => search(q), q ? 300 : 0)
    return () => clearTimeout(t)
  }, [q])

  const join = async (id) => {
    try {
      await api.post(`/rooms/${id}/join`)
      onJoined(id)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to join')
    }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Browse Public Rooms" onClose={onClose} />
      <div className="px-5 py-3 border-b border-gray-700">
        <input
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-500"
          placeholder="Search rooms…"
          value={q}
          onChange={e => setQ(e.target.value)}
          autoFocus
        />
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading && <p className="text-center text-sm text-gray-500 py-6">Loading…</p>}
        {error && <p className="text-center text-sm text-red-400 py-6">{error}</p>}
        {!loading && !error && rooms.length === 0 && (
          <div className="text-center py-8 space-y-1">
            <p className="text-2xl">🏠</p>
            <p className="text-sm text-gray-500">{q ? 'No rooms match your search' : 'No public rooms yet'}</p>
            <p className="text-xs text-gray-600">{q ? 'Try a different name' : 'Create one and invite others!'}</p>
          </div>
        )}
        {rooms.map(r => {
          const joined = myRoomIds.has(r.id)
          return (
            <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-700/50 transition-colors border-b border-gray-700/30 last:border-0">
              <div className="min-w-0">
                <p className="text-sm text-gray-200 font-medium"># {r.name}</p>
                {r.description && <p className="text-xs text-gray-400 truncate mt-0.5">{r.description}</p>}
                <p className="text-xs text-gray-600 mt-0.5">{r._count?.members ?? 0} members</p>
              </div>
              {joined
                ? <span className="text-xs text-gray-500 shrink-0 ml-3 bg-gray-700 px-2 py-1 rounded">Joined</span>
                : <button onClick={() => join(r.id)} className="text-xs bg-indigo-700 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors shrink-0 ml-3 font-medium">Join</button>
              }
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
