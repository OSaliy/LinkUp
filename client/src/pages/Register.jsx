import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const register = useAuthStore(s => s.register)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(form.email, form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (name) => (e) => setForm(f => ({ ...f, [name]: e.target.value }))

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">LinkUp</h1>
          <p className="text-gray-400 mt-1 text-sm">Create your account</p>
        </div>
        <form onSubmit={submit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded px-3 py-2 text-red-300 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <input
              className="w-full bg-gray-700 border border-gray-600 px-3 py-2.5 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              type="email" placeholder="Email"
              value={form.email} onChange={set('email')} required autoFocus
            />
            <input
              className="w-full bg-gray-700 border border-gray-600 px-3 py-2.5 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              type="text" placeholder="Username"
              value={form.username} onChange={set('username')} required
              pattern="[a-zA-Z0-9_-]+" title="Letters, numbers, _ and - only"
            />
            <input
              className="w-full bg-gray-700 border border-gray-600 px-3 py-2.5 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              type="password" placeholder="Password (min 6 chars)"
              value={form.password} onChange={set('password')} required
            />
            <input
              className="w-full bg-gray-700 border border-gray-600 px-3 py-2.5 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              type="password" placeholder="Confirm password"
              value={form.confirm} onChange={set('confirm')} required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-sm text-center text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
