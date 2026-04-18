import { create } from 'zustand'
import api from '../api'
import { connectSocket, disconnectSocket } from '../socket'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  init: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data, loading: false })
      connectSocket()
    } catch {
      set({ user: null, loading: false })
    }
  },

  login: async (email, password, remember) => {
    const { data } = await api.post('/auth/login', { email, password, remember })
    set({ user: data.user })
    connectSocket()
    return data.user
  },

  register: async (email, username, password) => {
    const { data } = await api.post('/auth/register', { email, username, password })
    set({ user: data.user })
    connectSocket()
    return data.user
  },

  logout: async () => {
    await api.post('/auth/logout')
    disconnectSocket()
    set({ user: null })
  },
}))
