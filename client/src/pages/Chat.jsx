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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900 text-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — static in flow on desktop, full-height fixed drawer on mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-30 h-full
        md:static md:translate-x-0
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onRoomSelect={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Mobile top bar — always visible, hidden on desktop */}
        <div className="flex items-center md:hidden bg-gray-850 bg-gray-800 border-b border-gray-700 px-3 py-3 flex-shrink-0 safe-top">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors mr-3 text-sm font-medium"
            aria-label="Open menu"
          >
            ☰ Menu
          </button>
          <span className="text-sm font-semibold text-gray-200 truncate">
            {activeRoom
              ? activeRoom.visibility === 'DIRECT'
                ? activeRoom.name.replace('dm:', '').replace(':', ' / ')
                : `# ${activeRoom.name}`
              : 'LinkUp'}
          </span>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
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
              <p className="text-sm px-6">Select a room from the sidebar, or browse public rooms to join one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
