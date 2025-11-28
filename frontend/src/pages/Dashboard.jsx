import { Activity, Heart, Apple, Box, Zap, MessageSquare, Send, Camera } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import CameraView from '../components/CameraView'

export default function Dashboard({ data }) {
  const [chatMessage, setChatMessage] = useState('')
  const [cameraData, setCameraData] = useState(null)
  const chatEndRef = useRef(null)

  // Use incoming chat messages from Socket.IO
  const chatHistory = data.chatMessages || []

  // Fetch camera data (fallback for initial load)
  useEffect(() => {
    const fetchCameraData = async () => {
      try {
        const response = await fetch('/api/camera')
        if (response.ok) {
          const cameraResponse = await response.json()
          setCameraData(cameraResponse)
        }
      } catch (error) {
        console.error('Failed to fetch camera data:', error)
      }
    }

    // Initial load
    fetchCameraData()
  }, [])

  // Listen for real-time camera updates from Socket.IO
  useEffect(() => {
    if (data.camera) {
      setCameraData(data.camera)
    }
  }, [data.camera])

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: chatMessage }),
      })

      if (response.ok) {
        setChatMessage('')
      } else {
        console.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const stats = [
    {
      name: 'Health',
      value: `${Math.round((data.health || 0) * 100)}%`,
      icon: Heart,
      color: 'text-red-500',
      change: data.health < 0.5 ? 'Low!' : 'Good'
    },
    {
      name: 'Food',
      value: `${Math.round((data.food || 0) * 100)}%`,
      icon: Apple,
      color: 'text-green-500',
      change: data.food < 0.5 ? 'Hungry' : 'Full'
    },
    {
      name: 'Items',
      value: data.inventory?.length || 0,
      icon: Box,
      color: 'text-blue-500',
      change: 'In inventory'
    },
    {
      name: 'Status',
      value: data.currentGoal || 'Idle',
      icon: Activity,
      color: 'text-yellow-500',
      change: 'Active'
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 mt-1">Real-time bot overview with live camera view</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.name}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
                </div>
                <Icon className={`${stat.color} w-12 h-12 opacity-50`} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Camera View - Full Width */}
      <div className="card">
        <CameraView cameraData={cameraData} />
      </div>

      {/* In-Game Chat - Enhanced */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-400" />
          In-Game Chat
        </h3>
        
        {/* Chat Messages */}
        <div className="bg-slate-900 rounded-lg p-4 mb-4 h-64 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Chat messages from the server will appear here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {chatHistory.map((msg, i) => (
                <div key={i} className="bg-slate-800 rounded p-3 animate-fadeIn">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="text-primary-400 font-semibold">{msg.username || 'Player'}</span>
                      <p className="text-slate-300 mt-1 text-sm break-words">{msg.message}</p>
                    </div>
                    <span className="text-xs text-slate-500 ml-2 whitespace-nowrap">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Type a message to send in-game..."
            className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={!chatMessage.trim()}
            className="bg-primary-500 hover:bg-primary-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {(data.logs?.slice(-5) || []).reverse().map((log, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <Zap className="w-4 h-4 text-primary-500 mt-0.5" />
              <div>
                <p className="text-slate-300">{log.message || 'No activity'}</p>
                <p className="text-slate-500 text-xs">{log.timestamp || 'Just now'}</p>
              </div>
            </div>
          ))}
          {(!data.logs || data.logs.length === 0) && (
            <p className="text-slate-500 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}
