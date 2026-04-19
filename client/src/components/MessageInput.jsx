import { useState, useRef, useCallback } from 'react'
import EmojiPicker from 'emoji-picker-react'
import api from '../api'

export default function MessageInput({ onSend, replyTo, onCancelReply, roomId }) {
  const [content, setContent] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState([]) // [{file, comment}]
  const fileRef = useRef(null)

  const submit = (e) => {
    e?.preventDefault()
    if (uploading) return
    if (pendingFiles.length > 0) {
      uploadFiles(pendingFiles)
      return
    }
    if (!content.trim()) return
    onSend(content.trim())
    setContent('')
    setShowEmoji(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const uploadFiles = useCallback(async (items) => {
    if (!items?.length || !roomId) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('content', content.trim())
      for (const { file, comment } of items) {
        fd.append('file', file)
        fd.append('comment', comment || '')
      }
      await api.post(`/files/upload/${roomId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setContent('')
      setPendingFiles([])
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [roomId, content])

  const onFileChange = (e) => {
    const files = [...e.target.files]
    if (files.length) setPendingFiles(files.map(f => ({ file: f, comment: '' })))
    e.target.value = ''
  }

  const onPaste = async (e) => {
    const items = [...e.clipboardData.items]
    const imageItem = items.find(i => i.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      if (file) setPendingFiles([{ file, comment: '' }])
    }
  }

  return (
    <div className="p-3 border-t border-gray-700 bg-gray-850 flex-shrink-0">
      {pendingFiles.length > 0 && (
        <div className="mb-2 space-y-1.5 bg-gray-700/50 rounded-lg p-2">
          {pendingFiles.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-300 truncate max-w-[120px]" title={item.file.name}>
                {item.file.type.startsWith('image/') ? '🖼' : '📎'} {item.file.name}
              </span>
              <input
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Optional comment…"
                value={item.comment}
                onChange={e => setPendingFiles(pf => pf.map((x, j) => j === i ? { ...x, comment: e.target.value } : x))}
              />
              <button onClick={() => setPendingFiles(pf => pf.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400 text-xs transition-colors">✕</button>
            </div>
          ))}
        </div>
      )}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 bg-gray-700 rounded px-2 py-1.5 border-l-2 border-indigo-500">
          <span>Replying to <span className="text-indigo-400 font-semibold">{replyTo.author.username}</span>:</span>
          <span className="truncate flex-1 text-gray-300">{replyTo.content}</span>
          <button onClick={onCancelReply} className="hover:text-white ml-auto shrink-0">✕</button>
        </div>
      )}

      {showEmoji && (
        <div className="absolute bottom-20 left-4 z-50">
          <EmojiPicker
            theme="dark"
            onEmojiClick={(e) => setContent(c => c + e.emoji)}
            height={380}
            width={320}
          />
        </div>
      )}

      <form onSubmit={submit} className="flex gap-2 items-end">
        <button
          type="button"
          onClick={() => setShowEmoji(s => !s)}
          className={`text-xl pb-1.5 transition-colors ${showEmoji ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
          title="Emoji"
        >
          😊
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-gray-400 hover:text-white text-xl pb-1.5 transition-colors disabled:opacity-40"
          title="Attach file"
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          multiple
          accept="*/*"
          onChange={onFileChange}
        />
        <textarea
          className="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-sm resize-none min-h-[40px] max-h-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-500"
          placeholder={uploading ? 'Uploading…' : pendingFiles.length ? 'Optional message with file…' : 'Message… (Shift+Enter for newline)'}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={1}
          disabled={uploading}
        />
        <button
          type="submit"
          disabled={(!content.trim() && pendingFiles.length === 0) || uploading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {uploading ? '…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
