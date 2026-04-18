import { useState, useRef } from 'react'
import EmojiPicker from 'emoji-picker-react'

export default function MessageInput({ onSend, replyTo, onCancelReply }) {
  const [content, setContent] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const fileRef = useRef(null)

  const submit = (e) => {
    e?.preventDefault()
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

  const onPaste = async (e) => {
    const items = [...e.clipboardData.items]
    const imageItem = items.find(i => i.type.startsWith('image/'))
    if (imageItem) {
      e.preventDefault()
      const file = imageItem.getAsFile()
      // TODO: upload pasted image
    }
  }

  return (
    <div className="p-3 border-t border-gray-700 bg-gray-800">
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 bg-gray-700 rounded px-2 py-1">
          <span>Replying to <span className="text-indigo-400 font-semibold">{replyTo.author.username}</span>:</span>
          <span className="truncate flex-1">{replyTo.content}</span>
          <button onClick={onCancelReply} className="hover:text-white ml-auto">✕</button>
        </div>
      )}

      {showEmoji && (
        <div className="absolute bottom-16 left-4">
          <EmojiPicker
            theme="dark"
            onEmojiClick={(e) => setContent(c => c + e.emoji)}
          />
        </div>
      )}

      <form onSubmit={submit} className="flex gap-2 items-end">
        <button type="button" onClick={() => setShowEmoji(s => !s)}
          className="text-gray-400 hover:text-white text-xl pb-1.5">😊</button>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="text-gray-400 hover:text-white text-xl pb-1.5">📎</button>
        <input ref={fileRef} type="file" className="hidden" multiple
          onChange={e => {
            // TODO: implement file upload
            console.log('files', e.target.files)
          }}
        />
        <textarea
          className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm resize-none min-h-[40px] max-h-32"
          placeholder="Message... (Shift+Enter for newline)"
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          rows={1}
        />
        <button type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-sm font-medium">
          Send
        </button>
      </form>
    </div>
  )
}
