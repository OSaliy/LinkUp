import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const register = useAuthStore(s => s.register)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    try {
      await register(form.email, form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    }
  }

  const field = (name, type, placeholder) => (
    <input
      className="w-full bg-gray-700 px-3 py-2 rounded"
      type={type} placeholder={placeholder}
      value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
      required
    />
  )

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <form onSubmit={submit} className="bg-gray-800 p-8 rounded-lg w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Register</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {field('email', 'email', 'Email')}
        {field('username', 'text', 'Username')}
        {field('password', 'password', 'Password')}
        {field('confirm', 'password', 'Confirm password')}
        <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded font-medium">
          Create account
        </button>
        <p className="text-sm text-center text-gray-400">
          Already have an account? <Link to="/login" className="hover:text-white">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
