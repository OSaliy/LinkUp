import { useState, useEffect } from 'react'
import api from '../api'
import { useChatStore } from '../store/chat'
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmDialog } from './Modal'

export default function RoomModal({ room, currentUserId, onClose }) {
  const [tab, setTab] = useState('members')
  const { loadRooms, loadMembers } = useChatStore()
  const members = useChatStore(s => s.members[room.id] || [])
  const isOwner = room.ownerId === currentUserId
  const myMembership = members.find(m => m.userId === currentUserId)
  const isAdmin = myMembership?.role === 'ADMIN'

  useEffect(() => { loadMembers(room.id) }, [room.id])

  const tabs = [
    { id: 'members', label: 'Members' },
    ...(isAdmin ? [{ id: 'admins', label: 'Admins' }, { id: 'banned', label: 'Banned' }, { id: 'invite', label: 'Invite' }] : []),
    ...(isOwner ? [{ id: 'settings', label: 'Settings' }] : []),
  ]

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={`# ${room.name}`} onClose={onClose} />
      <div className="flex border-b border-gray-700 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap transition-colors ${
              tab === t.id ? 'text-white border-b-2 border-indigo-500 font-medium' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {tab === 'members' && <MembersTab room={room} members={members} isAdmin={isAdmin} isOwner={isOwner} currentUserId={currentUserId} onClose={onClose} loadRooms={loadRooms} loadMembers={loadMembers} />}
        {tab === 'admins' && <AdminsTab room={room} members={members} isOwner={isOwner} currentUserId={currentUserId} loadMembers={loadMembers} />}
        {tab === 'banned' && <BannedTab room={room} loadMembers={loadMembers} />}
        {tab === 'invite' && <InviteTab room={room} />}
        {tab === 'settings' && <SettingsTab room={room} onClose={onClose} loadRooms={loadRooms} />}
      </div>
    </Modal>
  )
}

function MembersTab({ room, members, isAdmin, isOwner, currentUserId, onClose, loadRooms, loadMembers }) {
  const [kicking, setKicking] = useState(null)
  const [leaving, setLeaving] = useState(false)

  const kick = async (m) => {
    await api.delete(`/rooms/${room.id}/members/${m.userId}`)
    loadMembers(room.id)
    setKicking(null)
  }

  const leave = async () => {
    await api.post(`/rooms/${room.id}/leave`)
    loadRooms()
    onClose()
  }

  return (
    <div className="p-4 space-y-1">
      {members.map(m => (
        <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-700/50 group">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-800 flex items-center justify-center text-xs font-bold">
              {m.user.username[0].toUpperCase()}
            </div>
            <span className="text-sm text-gray-200">{m.user.username}</span>
            {m.userId === room.ownerId && <span className="text-xs bg-amber-700/60 text-amber-300 px-1.5 py-0.5 rounded">owner</span>}
            {m.role === 'ADMIN' && m.userId !== room.ownerId && <span className="text-xs bg-indigo-700/60 text-indigo-300 px-1.5 py-0.5 rounded">admin</span>}
          </div>
          {isAdmin && m.userId !== currentUserId && m.userId !== room.ownerId && (
            <button onClick={() => setKicking(m)} className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
              Ban
            </button>
          )}
        </div>
      ))}
      {room.ownerId !== currentUserId && (
        <div className="pt-3 border-t border-gray-700 mt-3">
          <button
            onClick={() => setLeaving(true)}
            className="w-full text-sm text-red-400 hover:text-red-300 border border-red-900/50 rounded-lg py-2 hover:bg-red-900/20 transition-colors"
          >
            Leave room
          </button>
        </div>
      )}
      {kicking && (
        <ConfirmDialog
          title="Ban member"
          message={`Ban @${kicking.user.username} from #${room.name}? They will no longer be able to access this room.`}
          confirmLabel="Ban"
          onConfirm={() => kick(kicking)}
          onCancel={() => setKicking(null)}
        />
      )}
      {leaving && (
        <ConfirmDialog
          title="Leave room"
          message={`Leave #${room.name}? You can rejoin if it's public.`}
          confirmLabel="Leave"
          confirmClass="bg-gray-600 hover:bg-gray-500"
          onConfirm={leave}
          onCancel={() => setLeaving(false)}
        />
      )}
    </div>
  )
}

function AdminsTab({ room, members, isOwner, currentUserId, loadMembers }) {
  const promote = async (userId) => {
    await api.post(`/rooms/${room.id}/admins/${userId}`)
    loadMembers(room.id)
  }
  const demote = async (userId) => {
    await api.delete(`/rooms/${room.id}/admins/${userId}`)
    loadMembers(room.id)
  }

  return (
    <div className="p-4 space-y-1">
      {members.map(m => (
        <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-800 flex items-center justify-center text-xs font-bold">
              {m.user.username[0].toUpperCase()}
            </div>
            <span className="text-sm text-gray-200">{m.user.username}</span>
            {m.userId === room.ownerId && <span className="text-xs bg-amber-700/60 text-amber-300 px-1.5 py-0.5 rounded">owner</span>}
            {m.role === 'ADMIN' && m.userId !== room.ownerId && <span className="text-xs bg-indigo-700/60 text-indigo-300 px-1.5 py-0.5 rounded">admin</span>}
          </div>
          {isOwner && m.userId !== currentUserId && m.userId !== room.ownerId && (
            m.role === 'ADMIN'
              ? <button onClick={() => demote(m.userId)} className="text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-900/20 px-2 py-1 rounded transition-colors">Demote</button>
              : <button onClick={() => promote(m.userId)} className="text-xs text-green-400 hover:text-green-300 bg-green-900/20 px-2 py-1 rounded transition-colors">Make admin</button>
          )}
        </div>
      ))}
    </div>
  )
}

function BannedTab({ room, loadMembers }) {
  const [bans, setBans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/rooms/${room.id}/bans`).then(r => { setBans(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [room.id])

  const unban = async (userId) => {
    await api.delete(`/rooms/${room.id}/bans/${userId}`)
    setBans(b => b.filter(x => x.userId !== userId))
    loadMembers(room.id)
  }

  if (loading) return <p className="text-sm text-gray-500 text-center py-8">Loading…</p>
  if (bans.length === 0) return <p className="text-sm text-gray-500 text-center py-8">No banned users</p>

  return (
    <div className="p-4 space-y-1">
      {bans.map(b => (
        <div key={b.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-red-900 flex items-center justify-center text-xs font-bold">
              {b.user.username[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-gray-200">{b.user.username}</p>
              <p className="text-xs text-gray-500">Banned by {b.bannedBy?.username}</p>
            </div>
          </div>
          <button onClick={() => unban(b.userId)} className="text-xs text-green-400 hover:text-green-300 bg-green-900/20 px-2 py-1 rounded transition-colors">
            Unban
          </button>
        </div>
      ))}
    </div>
  )
}

function InviteTab({ room }) {
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const invite = async (e) => {
    e.preventDefault()
    setStatus(null)
    setLoading(true)
    try {
      await api.post(`/rooms/${room.id}/invitations`, { username })
      setStatus({ ok: true, msg: `Invitation sent to @${username}` })
      setUsername('')
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || 'Failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <form onSubmit={invite} className="space-y-3">
        <p className="text-sm text-gray-400">Invite a user to <span className="text-white font-medium"># {room.name}</span></p>
        <input
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-500"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          autoFocus
          required
        />
        {status && (
          <p className={`text-sm rounded px-2 py-1.5 ${status.ok ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
            {status.msg}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Sending…' : 'Send invitation'}
        </button>
      </form>
    </div>
  )
}

function SettingsTab({ room, onClose, loadRooms }) {
  const [form, setForm] = useState({ name: room.name, description: room.description || '', visibility: room.visibility })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setStatus(null)
    setLoading(true)
    try {
      await api.put(`/rooms/${room.id}`, form)
      setStatus({ ok: true, msg: 'Settings saved' })
      loadRooms()
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || 'Failed' })
    } finally {
      setLoading(false)
    }
  }

  const deleteRoom = async () => {
    await api.delete(`/rooms/${room.id}`)
    loadRooms()
    onClose()
  }

  return (
    <div className="p-4">
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Room name</label>
          <input
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Description</label>
          <input
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-500"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-2">Visibility</label>
          <div className="grid grid-cols-2 gap-2">
            {['PUBLIC', 'PRIVATE'].map(v => (
              <button key={v} type="button" onClick={() => setForm(f => ({ ...f, visibility: v }))}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.visibility === v ? 'bg-indigo-700 border-indigo-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400 hover:border-gray-500'
                }`}
              >
                {v === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
              </button>
            ))}
          </div>
        </div>
        {status && <p className={`text-sm rounded px-2 py-1.5 ${status.ok ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>{status.msg}</p>}
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2 rounded-lg text-sm font-medium transition-colors">
          {loading ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-gray-700">
        <button
          onClick={() => setDeleting(true)}
          className="w-full text-sm text-red-400 hover:text-red-300 border border-red-900/50 rounded-lg py-2 hover:bg-red-900/20 transition-colors"
        >
          Delete room
        </button>
      </div>

      {deleting && (
        <ConfirmDialog
          title="Delete room"
          message={`Delete #${room.name}? All messages and files will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete room"
          onConfirm={deleteRoom}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  )
}
