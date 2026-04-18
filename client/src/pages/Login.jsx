import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '', remember: false })
  // 'email' field accepts both email and username
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.email, form.password, form.remember)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">LinkUp</h1>
          <p className="text-gray-400 mt-1 text-sm">Sign in to your account</p>
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
              type="text" placeholder="Email or username"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required autoFocus autoComplete="username"
            />
            <input
              className="w-full bg-gray-700 border border-gray-600 px-3 py-2.5 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              type="password" placeholder="Password"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={form.remember}
              onChange={e => setForm(f => ({ ...f, remember: e.target.checked }))}
            />
            Keep me signed in
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="flex justify-between text-sm text-gray-500">
            <Link to="/forgot-password" className="hover:text-gray-300 transition-colors">Forgot password?</Link>
            <Link to="/register" className="hover:text-gray-300 transition-colors">Create account</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
