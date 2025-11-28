import { useEffect, useState, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3002'
const MAX_CHAT_HISTORY = 99 // Maximum number of chat messages to keep in memory
const MAX_LOG_HISTORY = 99  // Maximum number of log entries to keep in memory
const RECONNECT_ATTEMPTS = 10 // More attempts for better reliability

// Helper to create timestamp update for specific keys
const createTimestampUpdate = (keys) => {
  const now = Date.now()
  const result = {}
  for (const key of keys) {
    result[key] = now
  }
  return result
}

export function useSocket() {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [connectionQuality, setConnectionQuality] = useState('unknown') // 'good' | 'fair' | 'poor' | 'unknown'
  const latencyRef = useRef([])
  
  const [data, setData] = useState({
    bot: null,
    health: 0,
    food: 0,
    position: null,
    inventory: [],
    systems: {},
    logs: [],
    analytics: {},
    gameview: null,
    camera: null,
    chatMessages: [],
    // Timestamps for each data type to track freshness
    timestamps: {
      health: null,
      position: null,
      inventory: null,
      systems: null,
      analytics: null,
      camera: null,
    }
  })

  // Calculate connection quality based on latency
  const updateConnectionQuality = useCallback((latency) => {
    latencyRef.current.push(latency)
    if (latencyRef.current.length > 10) {
      latencyRef.current.shift()
    }
    const avgLatency = latencyRef.current.reduce((a, b) => a + b, 0) / latencyRef.current.length
    if (avgLatency < 100) setConnectionQuality('good')
    else if (avgLatency < 300) setConnectionQuality('fair')
    else setConnectionQuality('poor')
  }, [])

  // Request fresh data from server
  const requestRefresh = useCallback((dataType = 'all') => {
    if (socket && connected) {
      const startTime = Date.now()
      socket.emit('request:refresh', { type: dataType }, () => {
        updateConnectionQuality(Date.now() - startTime)
      })
    }
  }, [socket, connected, updateConnectionQuality])

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect()
      socket.connect()
    }
  }, [socket])

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    socketInstance.on('connect', () => {
      console.log('✓ Connected to bot')
      setConnected(true)
      setReconnecting(false)
      setLastUpdate(Date.now())
      latencyRef.current = []
      // Request initial data on connect
      socketInstance.emit('request:refresh', { type: 'all' })
    })

    socketInstance.on('disconnect', () => {
      console.log('✗ Disconnected from bot')
      setConnected(false)
      setConnectionQuality('unknown')
    })

    socketInstance.on('reconnecting', () => {
      setReconnecting(true)
    })

    socketInstance.on('reconnect', () => {
      setReconnecting(false)
      setConnected(true)
    })

    socketInstance.on('reconnect_failed', () => {
      setReconnecting(false)
      console.error('Failed to reconnect after multiple attempts')
    })

    socketInstance.on('bot:update', (update) => {
      const now = Date.now()
      const updateKeys = Object.keys(update)
      setData(prev => ({ 
        ...prev, 
        ...update,
        timestamps: { ...prev.timestamps, ...createTimestampUpdate(updateKeys) }
      }))
      setLastUpdate(now)
    })

    socketInstance.on('bot:health', (health) => {
      setData(prev => ({ 
        ...prev, 
        health: health.value, 
        food: health.food,
        timestamps: { ...prev.timestamps, health: Date.now() }
      }))
      setLastUpdate(Date.now())
    })

    socketInstance.on('bot:position', (position) => {
      setData(prev => ({ 
        ...prev, 
        position,
        timestamps: { ...prev.timestamps, position: Date.now() }
      }))
      setLastUpdate(Date.now())
    })

    socketInstance.on('bot:inventory', (inventory) => {
      setData(prev => ({ 
        ...prev, 
        inventory,
        timestamps: { ...prev.timestamps, inventory: Date.now() }
      }))
      setLastUpdate(Date.now())
    })

    socketInstance.on('bot:systems', (systems) => {
      setData(prev => ({ 
        ...prev, 
        systems,
        timestamps: { ...prev.timestamps, systems: Date.now() }
      }))
      setLastUpdate(Date.now())
    })

    socketInstance.on('bot:gameview', (gameview) => {
      setData(prev => ({ ...prev, gameview }))
      setLastUpdate(Date.now())
    })

    socketInstance.on('bot:camera', (camera) => {
      setData(prev => ({ 
        ...prev, 
        camera,
        timestamps: { ...prev.timestamps, camera: Date.now() }
      }))
      setLastUpdate(Date.now())
    })

    socketInstance.on('bot:chat', (chatMessage) => {
      setData(prev => ({
        ...prev,
        chatMessages: [...prev.chatMessages.slice(-MAX_CHAT_HISTORY), chatMessage]
      }))
      setLastUpdate(Date.now())
    })

    socketInstance.on('bot:log', (log) => {
      setData(prev => ({
        ...prev,
        logs: [...prev.logs.slice(-MAX_LOG_HISTORY), log]
      }))
      setLastUpdate(Date.now())
    })

    socketInstance.on('bot:analytics', (analytics) => {
      setData(prev => ({ 
        ...prev, 
        analytics,
        timestamps: { ...prev.timestamps, analytics: Date.now() }
      }))
      setLastUpdate(Date.now())
    })

    // Handle pong for latency measurement
    socketInstance.on('pong', (latency) => {
      updateConnectionQuality(latency)
    })

    setSocket(socketInstance)

    // Note: Server handles periodic updates (every 2s for health/position, every 5s for analytics)
    // Client only needs to request refresh on-demand via requestRefresh()

    return () => {
      socketInstance.disconnect()
    }
  }, [updateConnectionQuality])

  const sendCommand = useCallback((command, args = {}) => {
    if (socket && connected) {
      socket.emit('command', { command, args })
    }
  }, [socket, connected])

  // Clear logs function
  const clearLogs = useCallback(() => {
    setData(prev => ({ ...prev, logs: [] }))
  }, [])

  return {
    socket,
    connected,
    reconnecting,
    connectionQuality,
    lastUpdate,
    data,
    sendCommand,
    requestRefresh,
    reconnect,
    clearLogs,
  }
}
