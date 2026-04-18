import { create } from 'zustand'
import api from '../api'
import socket from '../socket'

export const useChatStore = create((set, get) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  members: {},
  presence: {},
  unread: {},

  loadRooms: async () => {
    const { data } = await api.get('/rooms/mine')
    set({ rooms: data })
  },

  setActiveRoom: async (roomId) => {
    set(s => ({
      activeRoomId: roomId,
      unread: { ...s.unread, [roomId]: 0 },
    }))
    socket.emit('join_room', { roomId })
    await get().loadMessages(roomId)
    await get().loadMembers(roomId)
  },

  loadMessages: async (roomId, before) => {
    const { data } = await api.get(`/messages/room/${roomId}`, {
      params: { before, limit: 50 },
    })
    const sorted = [...data].reverse()
    set(s => ({
      messages: {
        ...s.messages,
        [roomId]: before
          ? [...sorted, ...(s.messages[roomId] || [])]
          : sorted,
      },
    }))
    return data.length
  },

  loadMembers: async (roomId) => {
    const { data } = await api.get(`/rooms/${roomId}/members`)
    set(s => ({ members: { ...s.members, [roomId]: data } }))
  },

  sendMessage: async (roomId, content, replyToId) => {
    await api.post(`/messages/room/${roomId}`, { content, replyToId })
  },

  onNewMessage: (message) => {
    const { activeRoomId } = get()
    set(s => {
      const roomMessages = s.messages[message.roomId] || []
      return {
        messages: {
          ...s.messages,
          [message.roomId]: [...roomMessages, message],
        },
        unread: message.roomId !== activeRoomId
          ? { ...s.unread, [message.roomId]: (s.unread[message.roomId] || 0) + 1 }
          : s.unread,
      }
    })
  },

  onMessageUpdated: (message) => {
    set(s => ({
      messages: {
        ...s.messages,
        [message.roomId]: (s.messages[message.roomId] || []).map(m =>
          m.id === message.id ? message : m
        ),
      },
    }))
  },

  onMessageDeleted: ({ id, roomId }) => {
    set(s => ({
      messages: {
        ...s.messages,
        [roomId]: (s.messages[roomId] || []).filter(m => m.id !== id),
      },
    }))
  },

  setPresence: (userId, status) => {
    set(s => ({ presence: { ...s.presence, [userId]: status } }))
  },

  removeRoom: (roomId) => {
    set(s => ({
      rooms: s.rooms.filter(r => r.id !== roomId),
      activeRoomId: s.activeRoomId === roomId ? null : s.activeRoomId,
    }))
  },
}))
