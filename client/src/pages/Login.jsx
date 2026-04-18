import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '', remember: false })
  const [error, setError] = useState('')
  const login = useAuthStore(s => s.login)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(form.email, form.password, form.remember)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <form onSubmit={submit} className="bg-gray-800 p-8 rounded-lg w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Sign In</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          className="w-full bg-gray-700 px-3 py-2 rounded"
          type="email" placeholder="Email"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          required
        />
        <input
          className="w-full bg-gray-700 px-3 py-2 rounded"
          type="password" placeholder="Password"
          value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          required
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.remember}
            onChange={e => setForm(f => ({ ...f, remember: e.target.checked }))} />
          Keep me signed in
        </label>
        <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded font-medium">
          Sign in
        </button>
        <div className="flex justify-between text-sm text-gray-400">
          <Link to="/forgot-password" className="hover:text-white">Forgot password?</Link>
          <Link to="/register" className="hover:text-white">Register</Link>
        </div>
      </form>
    </div>
  )
}
