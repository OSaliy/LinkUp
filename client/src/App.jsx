import { useEffect } from 'react'
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
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const init = useAuthStore(s => s.init)
  const { onNewMessage, onMessageUpdated, onMessageDeleted, setPresence, loadRooms } = useChatStore()

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    socket.on('message:new', onNewMessage)
    socket.on('message:updated', onMessageUpdated)
    socket.on('message:deleted', onMessageDeleted)
    socket.on('presence', ({ userId, status }) => setPresence(userId, status))
    socket.on('connect', loadRooms)

    return () => {
      socket.off('message:new', onNewMessage)
      socket.off('message:updated', onMessageUpdated)
      socket.off('message:deleted', onMessageDeleted)
      socket.off('presence')
      socket.off('connect', loadRooms)
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/*" element={<RequireAuth><Chat /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  )
}
