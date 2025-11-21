import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002'

export function useSocket() {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [data, setData] = useState({
    bot: null,
    health: 0,
    food: 0,
    position: null,
    inventory: [],
    systems: {},
    logs: [],
    analytics: {}
  })

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketInstance.on('connect', () => {
      console.log('✓ Connected to bot')
      setConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('✗ Disconnected from bot')
      setConnected(false)
    })

    socketInstance.on('bot:update', (update) => {
      setData(prev => ({ ...prev, ...update }))
    })

    socketInstance.on('bot:health', (health) => {
      setData(prev => ({ ...prev, health: health.value, food: health.food }))
    })

    socketInstance.on('bot:position', (position) => {
      setData(prev => ({ ...prev, position }))
    })

    socketInstance.on('bot:inventory', (inventory) => {
      setData(prev => ({ ...prev, inventory }))
    })

    socketInstance.on('bot:systems', (systems) => {
      setData(prev => ({ ...prev, systems }))
    })

    socketInstance.on('bot:log', (log) => {
      setData(prev => ({
        ...prev,
        logs: [...prev.logs.slice(-99), log]
      }))
    })

    socketInstance.on('bot:analytics', (analytics) => {
      setData(prev => ({ ...prev, analytics }))
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const sendCommand = (command, args = {}) => {
    if (socket && connected) {
      socket.emit('command', { command, args })
    }
  }

  return {
    socket,
    connected,
    data,
    sendCommand
  }
}
