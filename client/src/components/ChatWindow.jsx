import { useEffect, useRef, useState, useCallback } from 'react'
import { useChatStore } from '../store/chat'
import { useAuthStore } from '../store/auth'
import MessageItem from './MessageItem'
import MessageInput from './MessageInput'

export default function ChatWindow({ roomId }) {
  const { messages, loadMessages, sendMessage } = useChatStore()
  const user = useAuthStore(s => s.user)
  const msgs = messages[roomId] || []
  const bottomRef = useRef(null)
  const containerRef = useRef(null)
  const [atBottom, setAtBottom] = useState(true)
  const [replyTo, setReplyTo] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length])

  const onScroll = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    setAtBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 10)

    if (el.scrollTop < 100 && !loadingMore && msgs.length > 0) {
      setLoadingMore(true)
      const before = msgs[0]?.createdAt
      const prevScrollHeight = el.scrollHeight
      const count = await loadMessages(roomId, before)
      if (count > 0) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevScrollHeight
        })
      }
      setLoadingMore(false)
    }
  }, [msgs, loadingMore, roomId])

  const handleSend = async (content) => {
    await sendMessage(roomId, content, replyTo?.id)
    setReplyTo(null)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div ref={containerRef} onScroll={onScroll}
        className="flex-1 overflow-y-auto p-4 space-y-1">
        {loadingMore && <p className="text-center text-xs text-gray-500">Loading...</p>}
        {msgs.map(m => (
          <MessageItem key={m.id} message={m} currentUserId={user?.id}
            onReply={setReplyTo} roomId={roomId} />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />
    </div>
  )
}
