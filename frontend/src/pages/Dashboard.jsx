import { Activity, Heart, Apple, Box, Zap, MessageSquare, Send } from 'lucide-react'
import { useState, useEffect, useRef, memo } from 'react'
import CameraView from '../components/CameraView'
import { Card, StatCard, LiveBadge } from '../components/ui'
import { useSocket } from '../hooks/useSocket'

const ChatMessage = memo(function ChatMessage({ msg }) {
  return (
    <div className="bg-slate-800 rounded p-3 animate-fadeIn">
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
  )
})

const ActivityItem = memo(function ActivityItem({ log }) {
  return (
    <div className="flex items-start gap-3 text-sm animate-fadeIn">
      <Zap className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-slate-300 truncate">{log.message || 'No activity'}</p>
        <p className="text-slate-500 text-xs">{log.timestamp || 'Just now'}</p>
      </div>
    </div>
  )
})

export default function Dashboard({ data }) {
  const { connected, lastUpdate } = useSocket()
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

  // Determine health/food status
  const healthStatus = data.health < 0.3 ? 'Critical!' : data.health < 0.5 ? 'Low!' : 'Good'
  const foodStatus = data.food < 0.3 ? 'Starving!' : data.food < 0.5 ? 'Hungry' : 'Full'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Dashboard</h2>
          <p className="text-slate-400 mt-1">Real-time bot overview with live camera view</p>
        </div>
        <div className="flex items-center gap-4">
          <LiveBadge isLive={connected} />
          {lastUpdate && (
            <span className="text-xs text-slate-500">
              Updated: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Health"
          value={`${Math.round((data.health || 0) * 100)}%`}
          icon={Heart}
          iconColor={data.health < 0.5 ? 'text-red-500' : 'text-green-500'}
          subtitle={healthStatus}
          variant={data.health < 0.3 ? 'danger' : data.health < 0.5 ? 'warning' : 'success'}
          lastUpdated={data.timestamps?.health}
        />
        <StatCard
          title="Food"
          value={`${Math.round((data.food || 0) * 100)}%`}
          icon={Apple}
          iconColor={data.food < 0.5 ? 'text-yellow-500' : 'text-green-500'}
          subtitle={foodStatus}
          variant={data.food < 0.3 ? 'danger' : data.food < 0.5 ? 'warning' : 'success'}
          lastUpdated={data.timestamps?.health}
        />
        <StatCard
          title="Items"
          value={data.inventory?.length || 0}
          icon={Box}
          iconColor="text-blue-500"
          subtitle="In inventory"
          lastUpdated={data.timestamps?.inventory}
        />
        <StatCard
          title="Status"
          value={data.currentGoal || 'Idle'}
          icon={Activity}
          iconColor="text-yellow-500"
          subtitle="Current activity"
        />
      </div>

      {/* Camera View - Full Width */}
      <Card>
        <CameraView cameraData={cameraData} />
      </Card>

      {/* In-Game Chat - Enhanced */}
      <Card>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-400" />
          In-Game Chat
          {chatHistory.length > 0 && (
            <span className="text-xs text-slate-500 font-normal ml-2">
              ({chatHistory.length} messages)
            </span>
          )}
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
                <ChatMessage key={`${msg.timestamp}-${i}`} msg={msg} />
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
      </Card>

      {/* Recent Activity */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Recent Activity</h3>
          {data.logs?.length > 0 && (
            <span className="text-xs text-slate-500">
              {data.logs.length} events
            </span>
          )}
        </div>
        <div className="space-y-3">
          {(data.logs?.slice(-5) || []).reverse().map((log, i) => (
            <ActivityItem key={`${log.timestamp}-${i}`} log={log} />
          ))}
          {(!data.logs || data.logs.length === 0) && (
            <p className="text-slate-500 text-center py-8">No recent activity</p>
          )}
        </div>
      </Card>
    </div>
  )
}
