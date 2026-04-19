import { useState } from 'react'
import { useChatStore } from '../store/chat'
import { ConfirmDialog } from './Modal'
import api from '../api'

export default function MessageItem({ message, currentUserId, onReply, roomId, isAdmin }) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [imgPreview, setImgPreview] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { onMessageUpdated, onMessageDeleted } = useChatStore()

  const isOwn = message.authorId === currentUserId
  const canDelete = isOwn || isAdmin
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = new Date(message.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })

  const saveEdit = async () => {
    if (!editContent.trim()) return
    try {
      const { data } = await api.put(`/messages/${message.id}`, { content: editContent.trim() })
      onMessageUpdated(data)
      setEditing(false)
    } catch { /* silently fail */ }
  }

  const deleteMsg = async () => {
    try {
      await api.delete(`/messages/${message.id}`)
      onMessageDeleted({ id: message.id, roomId })
    } catch { /* silently fail */ }
    setConfirmDelete(false)
  }

  const isImage = (mime) => mime?.startsWith('image/')

  return (
    <>
      <div className={`group flex gap-3 px-3 py-1.5 rounded-lg hover:bg-gray-800/50 transition-colors`}>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
          {message.author.username[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={`text-sm font-semibold ${isOwn ? 'text-indigo-400' : 'text-gray-200'}`}>
              {message.author.username}
            </span>
            <span className="text-xs text-gray-600" title={`${date} ${time}`}>{time}</span>
            {message.editedAt && <span className="text-xs text-gray-600 italic">(edited)</span>}
          </div>

          {/* Reply context */}
          {message.replyTo && (
            <div className="flex items-start gap-1.5 mb-1 border-l-2 border-gray-600 pl-2 text-xs text-gray-500 max-w-sm">
              <span className="font-semibold text-gray-400 shrink-0">{message.replyTo.author?.username}:</span>
              <span className="truncate">{message.replyTo.content}</span>
            </div>
          )}

          {/* Content */}
          {editing ? (
            <div className="flex gap-2 mt-1">
              <textarea
                className="flex-1 bg-gray-700 rounded px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                  if (e.key === 'Escape') { setEditing(false); setEditContent(message.content) }
                }}
                rows={2}
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <button onClick={saveEdit} className="text-xs text-green-400 hover:text-green-300 px-2 py-0.5 rounded bg-green-900/30">Save</button>
                <button onClick={() => { setEditing(false); setEditContent(message.content) }} className="text-xs text-gray-400 hover:text-gray-300 px-2 py-0.5 rounded bg-gray-700">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-200 whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          )}

          {/* Attachments */}
          {message.attachments?.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {message.attachments.map(a => (
                <div key={a.id}>
                  {isImage(a.mimeType) ? (
                    <img
                      src={`/api/files/${a.id}`}
                      alt={a.originalName}
                      className="max-w-xs max-h-60 rounded-lg cursor-pointer object-cover border border-gray-700 hover:border-gray-500 transition-colors"
                      onClick={() => setImgPreview(`/api/files/${a.id}`)}
                      onError={e => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <a
                      href={`/api/files/${a.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-gray-800 rounded px-2 py-1 border border-gray-700 hover:border-gray-600 transition-colors"
                      download={a.originalName}
                    >
                      <span>📎</span>
                      <span>{a.originalName}</span>
                      <span className="text-gray-500">({formatBytes(a.size)})</span>
                    </a>
                  )}
                  {a.comment && <p className="text-xs text-gray-500 mt-0.5 ml-1">{a.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 pt-0.5 transition-opacity shrink-0">
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="text-gray-500 hover:text-gray-300 text-sm p-1 rounded hover:bg-gray-700 transition-colors"
              title="Reply"
            >
              ↩
            </button>
          )}
          {isOwn && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-gray-500 hover:text-gray-300 text-sm p-1 rounded hover:bg-gray-700 transition-colors"
              title="Edit"
            >
              ✏
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-gray-500 hover:text-red-400 text-sm p-1 rounded hover:bg-gray-700 transition-colors"
              title="Delete"
            >
              🗑
            </button>
          )}
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete message"
          message="Delete this message? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={deleteMsg}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Image lightbox */}
      {imgPreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-zoom-out" onClick={() => setImgPreview(null)}>
          <img src={imgPreview} className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" alt="Preview" />
        </div>
      )}
    </>
  )
}

function formatBytes(bytes) {
  if (!bytes) return '?'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
