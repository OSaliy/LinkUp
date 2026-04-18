import { useEffect, useRef, useState, useCallback } from 'react'
import { useChatStore } from '../store/chat'
import { useAuthStore } from '../store/auth'
import MessageItem from './MessageItem'
import MessageInput from './MessageInput'

export default function ChatWindow({ roomId, room }) {
  const { messages, loadMessages, sendMessage, members } = useChatStore()
  const user = useAuthStore(s => s.user)
  const msgs = messages[roomId] || []
  const bottomRef = useRef(null)
  const containerRef = useRef(null)
  const [atBottom, setAtBottom] = useState(true)
  const [replyTo, setReplyTo] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const myMembership = (members[roomId] || []).find(m => m.userId === user?.id)
  const isAdmin = myMembership?.role === 'ADMIN'
  const isLocked = room?.lockedAt

  useEffect(() => {
    setHasMore(true)
    setReplyTo(null)
  }, [roomId])

  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length])

  const onScroll = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    const bottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    setAtBottom(bottom)

    if (el.scrollTop < 100 && !loadingMore && hasMore && msgs.length > 0) {
      setLoadingMore(true)
      const before = msgs[0]?.createdAt
      const prevScrollHeight = el.scrollHeight
      const count = await loadMessages(roomId, before)
      if (count === 0) setHasMore(false)
      if (count > 0) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevScrollHeight
        })
      }
      setLoadingMore(false)
    }
  }, [msgs, loadingMore, hasMore, roomId])

  const handleSend = async (content) => {
    await sendMessage(roomId, content, replyTo?.id)
    setReplyTo(null)
  }

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setAtBottom(true)
  }

  const roomDisplayName = room
    ? room.visibility === 'DIRECT'
      ? room.name.replace('dm:', '').replace(':', ' / ')
      : `# ${room.name}`
    : ''

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-900">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-700/50 bg-gray-900 flex-shrink-0">
        <div>
          <h2 className="font-semibold text-gray-100">{roomDisplayName}</h2>
          {room?.description && <p className="text-xs text-gray-500 mt-0.5">{room.description}</p>}
        </div>
        {isLocked && (
          <span className="ml-auto text-xs text-amber-500 bg-amber-900/30 px-2 py-0.5 rounded">
            🔒 Conversation locked
          </span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto py-4 space-y-0.5"
      >
        {loadingMore && (
          <p className="text-center text-xs text-gray-600 py-2">Loading older messages…</p>
        )}
        {!hasMore && msgs.length > 0 && (
          <p className="text-center text-xs text-gray-600 py-2">Beginning of conversation</p>
        )}
        {msgs.length === 0 && !loadingMore && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        )}
        {msgs.map(m => (
          <MessageItem
            key={m.id}
            message={m}
            currentUserId={user?.id}
            onReply={isLocked ? null : setReplyTo}
            roomId={roomId}
            isAdmin={isAdmin}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {!atBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-60 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-full shadow-lg transition-colors z-10"
        >
          ↓ Latest
        </button>
      )}

      {/* Input */}
      {isLocked ? (
        <div className="p-3 border-t border-gray-700/50 text-center text-sm text-gray-500 bg-gray-900">
          This conversation is locked
        </div>
      ) : (
        <MessageInput
          onSend={handleSend}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          roomId={roomId}
        />
      )}
    </div>
  )
}
