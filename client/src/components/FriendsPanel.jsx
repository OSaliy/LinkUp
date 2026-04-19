import { useState, useEffect } from 'react'
import api from '../api'
import { useChatStore } from '../store/chat'
import { Modal, ModalHeader } from './Modal'

export default function FriendsPanel({ onClose }) {
  const [tab, setTab] = useState('friends')
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const { loadRooms, setActiveRoom } = useChatStore()

  const load = async () => {
    setLoading(true)
    const [f, r, inv] = await Promise.all([
      api.get('/contacts').then(x => x.data).catch(() => []),
      api.get('/contacts/requests').then(x => x.data).catch(() => []),
      api.get('/rooms/invitations/pending').then(x => x.data).catch(() => []),
    ])
    setFriends(f)
    setRequests(r)
    setInvites(inv)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openDM = async (userId) => {
    const { data } = await api.post(`/contacts/dm/${userId}`)
    await loadRooms()
    setActiveRoom(data.id)
    onClose()
  }

  const accept = async (id) => {
    await api.put(`/contacts/requests/${id}/accept`)
    load()
  }

  const decline = async (id) => {
    await api.delete(`/contacts/requests/${id}`)
    load()
  }

  const removeFriend = async (userId) => {
    await api.delete(`/contacts/friends/${userId}`)
    load()
  }

  const acceptInvite = async (roomId) => {
    await api.post(`/rooms/${roomId}/invitations/accept`)
    await loadRooms()
    load()
  }

  const declineInvite = async (roomId) => {
    await api.delete(`/rooms/${roomId}/invitations`)
    load()
  }

  const totalBadge = requests.length + invites.length

  const tabs = [
    { id: 'friends', label: 'Friends' },
    { id: 'requests', label: 'Requests', badge: requests.length },
    { id: 'invites', label: 'Invites', badge: invites.length },
    { id: 'add', label: 'Add Friend' },
  ]

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Friends & Direct Messages" onClose={onClose} />
      <div className="flex border-b border-gray-700">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              tab === t.id ? 'text-white border-b-2 border-indigo-500 font-medium' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {tab === 'friends' && (
          <div className="p-4 space-y-1">
            {loading && <p className="text-sm text-gray-500 text-center py-6">Loading…</p>}
            {!loading && friends.length === 0 && (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-sm text-gray-500">No friends yet</p>
                <p className="text-xs text-gray-600 mt-1">Switch to "Add Friend" to send a request</p>
              </div>
            )}
            {friends.map(f => (
              <div key={f.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-800 flex items-center justify-center text-sm font-bold">
                    {f.username[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-200">{f.username}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openDM(f.id)}
                    className="text-xs bg-indigo-700 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    Message
                  </button>
                  <button
                    onClick={() => removeFriend(f.id)}
                    className="text-xs bg-gray-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'requests' && (
          <div className="p-4 space-y-2">
            {loading && <p className="text-sm text-gray-500 text-center py-6">Loading…</p>}
            {!loading && requests.length === 0 && (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-gray-500">No pending requests</p>
              </div>
            )}
            {requests.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/40 border border-gray-700">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-800 flex items-center justify-center text-sm font-bold shrink-0">
                    {r.requester.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 font-medium">{r.requester.username}</p>
                    {r.message && <p className="text-xs text-gray-400 truncate">"{r.message}"</p>}
                  </div>
                </div>
                <div className="flex gap-1.5 ml-3 shrink-0">
                  <button onClick={() => accept(r.id)} className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors font-medium">
                    Accept
                  </button>
                  <button onClick={() => decline(r.id)} className="text-xs bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded-lg transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'invites' && (
          <div className="p-4 space-y-2">
            {loading && <p className="text-sm text-gray-500 text-center py-6">Loading…</p>}
            {!loading && invites.length === 0 && (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📨</p>
                <p className="text-sm text-gray-500">No pending room invitations</p>
              </div>
            )}
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/40 border border-gray-700">
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 font-medium"># {inv.room.name}</p>
                  {inv.room.description && <p className="text-xs text-gray-400 truncate mt-0.5">{inv.room.description}</p>}
                  <p className="text-xs text-gray-500 mt-0.5">from @{inv.inviter.username}</p>
                </div>
                <div className="flex gap-1.5 ml-3 shrink-0">
                  <button
                    onClick={() => acceptInvite(inv.room.id)}
                    className="text-xs bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineInvite(inv.room.id)}
                    className="text-xs bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'add' && <AddFriendTab onSent={load} />}
      </div>
    </Modal>
  )
}

function AddFriendTab({ onSent }) {
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const send = async (e) => {
    e.preventDefault()
    setStatus(null)
    setLoading(true)
    try {
      await api.post('/contacts/requests', { username, message: message || undefined })
      setStatus({ ok: true, msg: `Friend request sent to @${username}` })
      setUsername('')
      setMessage('')
      onSent()
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || 'Failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={send} className="p-4 space-y-3">
      <p className="text-sm text-gray-400">Send a friend request by username</p>
      <input
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-500"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        autoFocus
        required
      />
      <input
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-500"
        placeholder="Optional message"
        value={message}
        onChange={e => setMessage(e.target.value)}
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
        {loading ? 'Sending…' : 'Send request'}
      </button>
    </form>
  )
}
