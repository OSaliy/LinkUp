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
      {/* Row — own messages right, others left */}
      <div className={`group flex gap-2 px-3 py-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* Avatar */}
        {!isOwn && (
          <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
            {message.author.username[0].toUpperCase()}
          </div>
        )}

        {/* Bubble + meta */}
        <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>

          {/* Sender name + time */}
          <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isOwn && (
              <span className="text-xs font-semibold text-gray-300">{message.author.username}</span>
            )}
            <span className="text-xs text-gray-500" title={`${date} ${time}`}>{time}</span>
            {message.editedAt && <span className="text-xs text-gray-600 italic">(edited)</span>}
          </div>

          {/* Reply context */}
          {message.replyTo && (
            <div className={`flex items-start gap-1.5 mb-1 border-l-2 pl-2 text-xs text-gray-500 max-w-full
              ${isOwn ? 'border-indigo-400' : 'border-gray-600'}`}>
              <span className="font-semibold text-gray-400 shrink-0">{message.replyTo.author?.username}:</span>
              <span className="truncate">{message.replyTo.content}</span>
            </div>
          )}

          {/* Bubble */}
          <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed break-words
            ${isOwn
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-gray-700 text-gray-100 rounded-tl-sm'
            }`}>
            {editing ? (
              <div className="flex flex-col gap-1.5 min-w-[200px]">
                <textarea
                  className="bg-transparent resize-none focus:outline-none text-sm w-full"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
                    if (e.key === 'Escape') { setEditing(false); setEditContent(message.content) }
                  }}
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setEditing(false); setEditContent(message.content) }} className="text-xs opacity-70 hover:opacity-100">Cancel</button>
                  <button onClick={saveEdit} className="text-xs font-medium bg-white/20 hover:bg-white/30 rounded px-2 py-0.5">Save</button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}

            {/* Attachments */}
            {message.attachments?.length > 0 && (
              <div className={`mt-2 space-y-1.5 ${message.content ? 'pt-2 border-t border-white/10' : ''}`}>
                {message.attachments.map(a => (
                  <div key={a.id}>
                    {isImage(a.mimeType) ? (
                      <img
                        src={`/api/files/${a.id}`}
                        alt={a.originalName}
                        className="max-w-full max-h-60 rounded-lg cursor-pointer object-cover hover:opacity-90 transition-opacity"
                        onClick={() => setImgPreview(`/api/files/${a.id}`)}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <a
                        href={`/api/files/${a.id}`}
                        className="inline-flex items-center gap-1.5 text-xs bg-black/20 rounded px-2 py-1 hover:bg-black/30 transition-colors"
                        download={a.originalName}
                      >
                        <span>📎</span>
                        <span className="truncate max-w-[150px]">{a.originalName}</span>
                        <span className="opacity-70">({formatBytes(a.size)})</span>
                      </a>
                    )}
                    {a.comment && <p className="text-xs opacity-70 mt-0.5">{a.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons — appear on hover */}
        <div className={`opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity self-center`}>
          {onReply && (
            <button onClick={() => onReply(message)} className="text-gray-500 hover:text-gray-300 text-sm p-1 rounded hover:bg-gray-700 transition-colors" title="Reply">↩</button>
          )}
          {isOwn && !editing && (
            <button onClick={() => setEditing(true)} className="text-gray-500 hover:text-gray-300 text-sm p-1 rounded hover:bg-gray-700 transition-colors" title="Edit">✏</button>
          )}
          {canDelete && (
            <button onClick={() => setConfirmDelete(true)} className="text-gray-500 hover:text-red-400 text-sm p-1 rounded hover:bg-gray-700 transition-colors" title="Delete">🗑</button>
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
