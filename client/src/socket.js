import { io } from 'socket.io-client'

const socket = io('/', {
  withCredentials: true,
  autoConnect: false,
})

export function connectSocket() {
  if (!socket.connected) socket.connect()
}

export function disconnectSocket() {
  socket.disconnect()
}

export default socket
