import { useState } from 'react'
import { useAuthStore } from '../store/auth'
import { useChatStore } from '../store/chat'
import api from '../api'

export default function MessageItem({ message, currentUserId, onReply, roomId }) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const { onMessageUpdated, onMessageDeleted } = useChatStore()

  const isOwn = message.authorId === currentUserId
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const saveEdit = async () => {
    const { data } = await api.put(`/messages/${message.id}`, { content: editContent })
    onMessageUpdated(data)
    setEditing(false)
  }

  const deleteMsg = async () => {
    if (!confirm('Delete message?')) return
    await api.delete(`/messages/${message.id}`)
    onMessageDeleted({ id: message.id, roomId })
  }

  return (
    <div className={`group flex gap-2 px-2 py-1 rounded hover:bg-gray-800 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-indigo-400">{message.author.username}</span>
          <span className="text-xs text-gray-500">{time}</span>
          {message.editedAt && <span className="text-xs text-gray-500 italic">edited</span>}
        </div>

        {message.replyTo && (
          <div className="border-l-2 border-gray-500 pl-2 text-xs text-gray-400 mb-1 truncate max-w-xs">
            <span className="font-semibold">{message.replyTo.author.username}:</span> {message.replyTo.content}
          </div>
        )}

        {editing ? (
          <div className="flex gap-2">
            <input className="bg-gray-700 rounded px-2 py-1 text-sm flex-1"
              value={editContent} onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false) }}
              autoFocus
            />
            <button onClick={saveEdit} className="text-xs text-green-400">Save</button>
            <button onClick={() => setEditing(false)} className="text-xs text-gray-400">Cancel</button>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {message.attachments?.map(a => (
          <a key={a.id} href={`/api/files/${a.id}`}
            className="text-xs text-indigo-400 hover:underline mt-1 block">
            📎 {a.originalName}
            {a.comment && <span className="text-gray-400 ml-1">— {a.comment}</span>}
          </a>
        ))}
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-gray-500">
        <button onClick={() => onReply(message)} title="Reply">↩</button>
        {isOwn && <button onClick={() => setEditing(true)} title="Edit">✏️</button>}
        {isOwn && <button onClick={deleteMsg} title="Delete">🗑</button>}
      </div>
    </div>
  )
}
