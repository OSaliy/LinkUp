import { useEffect, useCallback, useRef, useState } from 'react'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import MemberList from '../components/MemberList'
import { useChatStore } from '../store/chat'
import socket from '../socket'

export default function Chat() {
  const { activeRoomId, rooms, unread } = useChatStore()
  const activityTimer = useRef(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

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

  useEffect(() => {
    const total = Object.values(unread).reduce((a, b) => a + b, 0)
    document.title = total > 0 ? `(${total}) LinkUp` : 'LinkUp'
    return () => { document.title = 'LinkUp' }
  }, [unread])

  // Close sidebar when a room is selected on mobile
  const handleRoomSelect = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on desktop, drawer on mobile */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-30
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar onRoomSelect={handleRoomSelect} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative min-w-0">
        {/* Mobile header with hamburger */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center md:hidden bg-gray-900 border-b border-gray-700/50 px-3 py-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors mr-2"
          >
            ☰
          </button>
          <span className="text-sm font-medium text-gray-300 truncate">
            {activeRoom
              ? activeRoom.visibility === 'DIRECT'
                ? activeRoom.name.replace('dm:', '').replace(':', ' / ')
                : `# ${activeRoom.name}`
              : 'LinkUp'}
          </span>
        </div>

        {activeRoomId ? (
          <div className="flex flex-1 overflow-hidden pt-[44px] md:pt-0">
            <ChatWindow roomId={activeRoomId} room={activeRoom} />
            {activeRoom?.visibility !== 'DIRECT' && (
              <div className="hidden lg:block">
                <MemberList roomId={activeRoomId} room={activeRoom} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center gap-3 text-gray-600 pt-[44px] md:pt-0">
            <p className="text-5xl">💬</p>
            <p className="text-lg font-medium text-gray-500">Welcome to LinkUp</p>
            <p className="text-sm px-6">Select a room from the sidebar, or browse public rooms to join one.</p>
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden mt-2 text-sm bg-indigo-700 hover:bg-indigo-600 px-4 py-2 rounded-lg transition-colors font-medium"
            >
              Open sidebar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
