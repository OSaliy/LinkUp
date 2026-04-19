import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [step, setStep] = useState('request') // request | reset | done
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const requestReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setToken(data.resetToken || '')
      setMsg('Token generated. In production this would be sent to your email.')
      setStep('reset')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const doReset = async (e) => {
    e.preventDefault()
    setError('')
    if (newPw.length < 8) { setError('Password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: newPw })
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired token')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-gray-700 border border-gray-600 px-3 py-2.5 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors'

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">LinkUp</h1>
          <p className="text-gray-400 mt-1 text-sm">Reset your password</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded px-3 py-2 text-red-300 text-sm">
              {error}
            </div>
          )}
          {msg && (
            <div className="bg-indigo-900/30 border border-indigo-700 rounded px-3 py-2 text-indigo-300 text-sm">
              {msg}
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={requestReset} className="space-y-3">
              <p className="text-sm text-gray-400">Enter your email to receive a reset token.</p>
              <input
                className={inputCls}
                type="email" placeholder="Email"
                value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 rounded-lg font-medium transition-colors text-sm"
              >
                {loading ? 'Sending…' : 'Get reset token'}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={doReset} className="space-y-3">
              <p className="text-sm text-gray-400">Enter your reset token and choose a new password.</p>
              <input
                className={inputCls}
                placeholder="Reset token"
                value={token}
                onChange={e => setToken(e.target.value)}
                required autoFocus
              />
              <input
                className={inputCls}
                type="password" placeholder="New password (min 8 chars)"
                value={newPw} onChange={e => setNewPw(e.target.value)}
                required
              />
              <input
                className={inputCls}
                type="password" placeholder="Confirm new password"
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 rounded-lg font-medium transition-colors text-sm"
              >
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center py-4 space-y-3">
              <p className="text-2xl">✅</p>
              <p className="text-sm text-green-400 font-medium">Password reset successfully!</p>
              <p className="text-xs text-gray-500">You can now sign in with your new password.</p>
            </div>
          )}

          <Link to="/login" className="block text-sm text-center text-gray-500 hover:text-gray-300 transition-colors">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
