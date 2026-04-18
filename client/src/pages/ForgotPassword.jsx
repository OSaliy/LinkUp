import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPw, setNewPw] = useState('')
  const [step, setStep] = useState('request')
  const [msg, setMsg] = useState('')

  const requestReset = async (e) => {
    e.preventDefault()
    const { data } = await api.post('/auth/forgot-password', { email })
    setToken(data.resetToken || '')
    setMsg('Reset token generated. In production this would be emailed.')
    setStep('reset')
  }

  const doReset = async (e) => {
    e.preventDefault()
    await api.post('/auth/reset-password', { token, password: newPw })
    setMsg('Password reset. You can now sign in.')
    setStep('done')
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Forgot Password</h1>
        {msg && <p className="text-green-400 text-sm">{msg}</p>}

        {step === 'request' && (
          <form onSubmit={requestReset} className="space-y-4">
            <input
              className="w-full bg-gray-700 px-3 py-2 rounded"
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required
            />
            <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded font-medium">
              Send reset link
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={doReset} className="space-y-4">
            <input
              className="w-full bg-gray-700 px-3 py-2 rounded"
              placeholder="Reset token" value={token}
              onChange={e => setToken(e.target.value)} required
            />
            <input
              className="w-full bg-gray-700 px-3 py-2 rounded"
              type="password" placeholder="New password" value={newPw}
              onChange={e => setNewPw(e.target.value)} required
            />
            <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded font-medium">
              Reset password
            </button>
          </form>
        )}

        <Link to="/login" className="block text-sm text-center text-gray-400 hover:text-white">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
