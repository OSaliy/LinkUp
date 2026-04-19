import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Generic modal wrapper — renders into document.body via portal so it
// always covers the full viewport regardless of parent stacking context
export function Modal({ onClose, children, width = 'max-w-md' }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.() }}
    >
      <div className={`bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full ${width} overflow-hidden`}>
        {children}
      </div>
    </div>,
    document.body
  )
}

export function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
      <h2 className="font-semibold text-base text-gray-100">{title}</h2>
      {onClose && (
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700">
          ✕
        </button>
      )}
    </div>
  )
}

export function ModalBody({ children, className = '' }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>
}

export function ModalFooter({ children }) {
  return <div className="flex gap-2 justify-end px-5 py-4 border-t border-gray-700 bg-gray-800/50">{children}</div>
}

// Confirm dialog — replaces window.confirm
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', confirmClass = 'bg-red-700 hover:bg-red-600', onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel} width="max-w-sm">
      <ModalHeader title={title} onClose={onCancel} />
      <ModalBody>
        <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
      </ModalBody>
      <ModalFooter>
        <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition-colors ${confirmClass}`}>
          {confirmLabel}
        </button>
      </ModalFooter>
    </Modal>
  )
}

// Input prompt dialog — replaces window.prompt
export function PromptDialog({ title, label, placeholder, defaultValue = '', confirmLabel = 'OK', onConfirm, onCancel, children }) {
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = (e) => {
    e?.preventDefault()
    const val = inputRef.current?.value?.trim()
    if (val) onConfirm(val)
  }

  return (
    <Modal onClose={onCancel} width="max-w-sm">
      <ModalHeader title={title} onClose={onCancel} />
      <form onSubmit={submit}>
        <ModalBody className="space-y-3">
          {label && <label className="text-sm text-gray-400">{label}</label>}
          <input
            ref={inputRef}
            defaultValue={defaultValue}
            placeholder={placeholder}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-500"
          />
          {children}
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
            {confirmLabel}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
