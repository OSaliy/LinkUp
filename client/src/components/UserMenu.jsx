import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import api from '../api'
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmDialog } from './Modal'

export default function UserMenu({ user, onClose }) {
  const [view, setView] = useState('menu') // menu | sessions | password | delete
  const logout = useAuthStore(s => s.logout)

  return (
    <>
      {view === 'menu' && (
        <Modal onClose={onClose} width="max-w-xs">
          <ModalHeader title={user.username} onClose={onClose} />
          <ModalBody className="py-2 px-2">
            <nav className="space-y-0.5">
              <MenuItem icon="🖥" label="Active sessions" onClick={() => setView('sessions')} />
              <MenuItem icon="🔑" label="Change password" onClick={() => setView('password')} />
              <div className="border-t border-gray-700 my-2" />
              <MenuItem icon="🚪" label="Sign out" onClick={logout} className="text-gray-400 hover:text-red-400" />
              <MenuItem icon="⚠️" label="Delete account" onClick={() => setView('delete')} className="text-red-500 hover:text-red-400" />
            </nav>
          </ModalBody>
        </Modal>
      )}
      {view === 'sessions' && <SessionsView onBack={() => setView('menu')} onClose={onClose} />}
      {view === 'password' && <ChangePasswordView onBack={() => setView('menu')} onClose={onClose} />}
      {view === 'delete' && <DeleteAccountView onBack={() => setView('menu')} onClose={onClose} />}
    </>
  )
}

function MenuItem({ icon, label, onClick, className = 'text-gray-300 hover:text-white' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 text-sm transition-colors text-left ${className}`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  )
}

function SessionsView({ onBack, onClose }) {
  const [sessions, setSessions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(null)

  useEffect(() => {
    api.get('/auth/sessions').then(r => { setSessions(r.data); setLoading(false) })
  }, [])

  const revoke = async (id) => {
    setRevoking(id)
    await api.delete(`/auth/sessions/${id}`)
    setSessions(s => s.filter(x => x.id !== id))
    setRevoking(null)
  }

  return (
    <Modal onClose={onClose} width="max-w-md">
      <ModalHeader title="Active Sessions" onClose={onClose} />
      <ModalBody className="space-y-2 max-h-80 overflow-y-auto">
        <button onClick={onBack} className="text-xs text-indigo-400 hover:text-indigo-300 mb-2 flex items-center gap-1">
          ← Back
        </button>
        {loading && <p className="text-sm text-gray-500 py-4 text-center">Loading…</p>}
        {sessions?.map(s => (
          <div key={s.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2.5">
            <div>
              <p className="text-sm text-gray-200 font-medium">{s.browser || 'Unknown browser'}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {s.ip} · {new Date(s.lastActiveAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => revoke(s.id)}
              disabled={revoking === s.id}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors ml-3"
            >
              {revoking === s.id ? '…' : 'Revoke'}
            </button>
          </div>
        ))}
        {sessions?.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No sessions</p>}
      </ModalBody>
    </Modal>
  )
}

function ChangePasswordView({ onBack, onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setStatus(null)
    if (form.next !== form.confirm) { setStatus({ ok: false, msg: 'Passwords do not match' }); return }
    if (form.next.length < 8) { setStatus({ ok: false, msg: 'Password must be at least 8 characters' }); return }
    setLoading(true)
    try {
      await api.put('/auth/password', { currentPassword: form.current, newPassword: form.next })
      setStatus({ ok: true, msg: 'Password changed successfully' })
      setForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || 'Failed' })
    } finally {
      setLoading(false)
    }
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <Modal onClose={onClose} width="max-w-sm">
      <ModalHeader title="Change Password" onClose={onClose} />
      <form onSubmit={submit}>
        <ModalBody className="space-y-3">
          <button type="button" onClick={onBack} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">← Back</button>
          {status && <p className={`text-sm rounded px-2 py-1 ${status.ok ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>{status.msg}</p>}
          <Input type="password" placeholder="Current password" value={form.current} onChange={f('current')} required />
          <Input type="password" placeholder="New password (min 8 chars)" value={form.next} onChange={f('next')} required />
          <Input type="password" placeholder="Confirm new password" value={form.confirm} onChange={f('confirm')} required />
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onBack} className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors">
            {loading ? 'Saving…' : 'Change password'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

function DeleteAccountView({ onBack, onClose }) {
  const [confirm, setConfirm] = useState(false)
  const logout = useAuthStore(s => s.logout)

  const deleteAccount = async () => {
    await api.delete('/users/me')
    logout()
    onClose()
  }

  if (confirm) {
    return (
      <ConfirmDialog
        title="Delete account"
        message="This is permanent. Your account, all rooms you own, and all messages in those rooms will be deleted forever."
        confirmLabel="Yes, delete my account"
        onConfirm={deleteAccount}
        onCancel={() => setConfirm(false)}
      />
    )
  }

  return (
    <Modal onClose={onClose} width="max-w-sm">
      <ModalHeader title="Delete Account" onClose={onClose} />
      <ModalBody className="space-y-3">
        <button type="button" onClick={onBack} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">← Back</button>
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-300 font-medium mb-1">This cannot be undone</p>
          <ul className="text-xs text-red-400 space-y-0.5 list-disc list-inside">
            <li>Your account will be permanently deleted</li>
            <li>All rooms you own will be deleted</li>
            <li>You will be removed from all other rooms</li>
          </ul>
        </div>
      </ModalBody>
      <ModalFooter>
        <button onClick={onBack} className="px-4 py-2 text-sm rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">Cancel</button>
        <button onClick={() => setConfirm(true)} className="px-4 py-2 text-sm rounded-lg bg-red-700 hover:bg-red-600 text-white font-medium transition-colors">
          Delete account
        </button>
      </ModalFooter>
    </Modal>
  )
}

function Input({ ...props }) {
  return (
    <input
      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-500"
      {...props}
    />
  )
}
