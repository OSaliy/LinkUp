import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { useChatStore } from './store/chat'
import socket from './socket'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Chat from './pages/Chat'

function RequireAuth({ children }) {
  const user = useAuthStore(s => s.user)
  const loading = useAuthStore(s => s.loading)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Connecting…</p>
        </div>
      </div>
    )
  }
  return user ? children : <Navigate to="/login" replace />
}

// Simple toast notification
function Toast({ notifications, onDismiss }) {
  if (notifications.length === 0) return null
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(n => (
        <div key={n.id} className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 shadow-xl flex items-start gap-3 max-w-sm">
          <span className="text-xl">{n.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200">{n.title}</p>
            {n.body && <p className="text-xs text-gray-400 mt-0.5">{n.body}</p>}
          </div>
          <button onClick={() => onDismiss(n.id)} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const init = useAuthStore(s => s.init)
  const { onNewMessage, onMessageUpdated, onMessageDeleted, setPresence, loadRooms, setActiveRoom, removeRoom } = useChatStore()
  const [notifications, setNotifications] = useState([])

  const addNotif = (icon, title, body) => {
    const id = Date.now()
    setNotifications(n => [...n, { id, icon, title, body }])
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 5000)
  }

  const dismissNotif = (id) => setNotifications(n => n.filter(x => x.id !== id))

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    socket.on('message:new', onNewMessage)
    socket.on('message:updated', onMessageUpdated)
    socket.on('message:deleted', onMessageDeleted)
    socket.on('presence', ({ userId, status }) => setPresence(userId, status))
    socket.on('connect', loadRooms)

    socket.on('room:deleted', ({ roomId }) => {
      removeRoom(roomId)
      addNotif('🗑', 'Room deleted', 'A room you were in has been deleted')
    })

    socket.on('room:member_banned', ({ roomId, userId }) => {
      const myId = useAuthStore.getState().user?.id
      if (userId === myId) {
        removeRoom(roomId)
        addNotif('🚫', 'Banned from room', 'You have been removed from a room')
      }
    })

    socket.on('room:invited', ({ roomName, invitedBy }) => {
      addNotif('📨', `Invited to #${roomName}`, `${invitedBy} invited you — check Friends & DMs`)
    })

    socket.on('friend:request', ({ from }) => {
      addNotif('👋', 'Friend request', `${from} wants to be friends`)
    })

    socket.on('friend:accepted', () => {
      addNotif('✅', 'Friend request accepted', null)
    })

    return () => {
      socket.off('message:new', onNewMessage)
      socket.off('message:updated', onMessageUpdated)
      socket.off('message:deleted', onMessageDeleted)
      socket.off('presence')
      socket.off('connect', loadRooms)
      socket.off('room:deleted')
      socket.off('room:member_banned')
      socket.off('room:invited')
      socket.off('friend:request')
      socket.off('friend:accepted')
    }
  }, [])

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/*" element={<RequireAuth><Chat /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
      <Toast notifications={notifications} onDismiss={dismissNotif} />
    </>
  )
}
