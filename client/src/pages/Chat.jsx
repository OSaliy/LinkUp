import { useEffect, useCallback, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import MemberList from '../components/MemberList'
import { useChatStore } from '../store/chat'
import socket from '../socket'

export default function Chat() {
  const { activeRoomId, rooms, unread } = useChatStore()
  const activityTimer = useRef(null)

  // Throttled activity emit — tells server user is active (not AFK)
  const emitActivity = useCallback(() => {
    if (activityTimer.current) return
    socket.emit('activity')
    activityTimer.current = setTimeout(() => { activityTimer.current = null }, 10_000)
  }, [])

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart']
    events.forEach(e => window.addEventListener(e, emitActivity, { passive: true }))
    return () => {
      events.forEach(e => window.removeEventListener(e, emitActivity))
      if (activityTimer.current) clearTimeout(activityTimer.current)
    }
  }, [emitActivity])
  const activeRoom = rooms.find(r => r.id === activeRoomId)

  // Update browser tab title with unread count
  useEffect(() => {
    const total = Object.values(unread).reduce((a, b) => a + b, 0)
    document.title = total > 0 ? `(${total}) LinkUp` : 'LinkUp'
    return () => { document.title = 'LinkUp' }
  }, [unread])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-gray-100">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden relative">
        {activeRoomId ? (
          <>
            <ChatWindow roomId={activeRoomId} room={activeRoom} />
            {activeRoom?.visibility !== 'DIRECT' && (
              <MemberList roomId={activeRoomId} room={activeRoom} />
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center gap-3 text-gray-600">
            <p className="text-5xl">💬</p>
            <p className="text-lg font-medium text-gray-500">Welcome to LinkUp</p>
            <p className="text-sm">Select a room from the sidebar, or browse public rooms to join one.</p>
          </div>
        )}
      </div>
    </div>
  )
}
