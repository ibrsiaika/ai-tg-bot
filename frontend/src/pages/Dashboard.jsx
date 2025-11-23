import { Activity, Heart, Apple, Box, Zap, MessageSquare, Send } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Dashboard({ data }) {
  const [chatMessage, setChatMessage] = useState('')
  const [gameViewData, setGameViewData] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  // Use incoming chat messages from Socket.IO
  const chatHistory = data.chatMessages || []

  // Fetch game view data every minute (fallback)
  useEffect(() => {
    const fetchGameView = async () => {
      try {
        const response = await fetch('/api/gameview')
        if (response.ok) {
          const data = await response.json()
          setGameViewData(data)
          setLastUpdate(new Date(data.timestamp))
        }
      } catch (error) {
        console.error('Failed to fetch game view:', error)
      }
    }

    // Initial load
    fetchGameView()

    // Refresh every 60 seconds
    const interval = setInterval(fetchGameView, 60000)

    return () => clearInterval(interval)
  }, [])

  // Listen for game view updates from WebSocket
  useEffect(() => {
    if (data.gameview) {
      setGameViewData(data.gameview)
      setLastUpdate(new Date(data.gameview.timestamp || Date.now()))
    }
  }, [data.gameview])

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
        // Message sent successfully
        // Note: Bot's own messages are filtered out by setupChatListener in dashboard.js,
        // so we won't see our sent messages echoed back in the chat history
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
      change: '+2%'
    },
    {
      name: 'Food',
      value: `${Math.round((data.food || 0) * 100)}%`,
      icon: Apple,
      color: 'text-green-500',
      change: '-5%'
    },
    {
      name: 'Items',
      value: data.inventory?.length || 0,
      icon: Box,
      color: 'text-blue-500',
      change: '+12'
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
        <p className="text-slate-400 mt-1">Real-time bot overview and statistics</p>
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

      {/* Two Column Layout for Game View and Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game View Data */}
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">Game Environment</h3>
          <div className="bg-slate-900 rounded-lg p-4 max-h-[400px] overflow-y-auto">
            {gameViewData ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-primary-400 font-semibold mb-2">Bot Position</h4>
                  <p className="text-slate-300 text-sm font-mono">
                    X: {Math.round(gameViewData.position.x)}, 
                    Y: {Math.round(gameViewData.position.y)}, 
                    Z: {Math.round(gameViewData.position.z)}
                  </p>
                </div>
                
                {gameViewData.nearbyEntities && gameViewData.nearbyEntities.length > 0 && (
                  <div>
                    <h4 className="text-primary-400 font-semibold mb-2">
                      Nearby Entities ({gameViewData.nearbyEntities.length})
                    </h4>
                    <div className="space-y-1">
                      {gameViewData.nearbyEntities.slice(0, 5).map((entity, i) => (
                        <div key={i} className="text-slate-300 text-sm flex justify-between">
                          <span>{entity.type}</span>
                          <span className="text-slate-500">{entity.distance}m away</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {gameViewData.nearbyBlocks && gameViewData.nearbyBlocks.length > 0 && (
                  <div>
                    <h4 className="text-primary-400 font-semibold mb-2">
                      Nearby Blocks ({gameViewData.nearbyBlocks.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from(new Set(gameViewData.nearbyBlocks.map(b => b.name)))
                        .slice(0, 8)
                        .map((blockName, i) => (
                          <div key={i} className="bg-slate-800 rounded px-2 py-1">
                            <span className="text-slate-300 text-xs">{blockName}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 py-8">
                <Box className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-sm">Loading game environment...</p>
                <p className="text-xs mt-2">Updates every minute</p>
              </div>
            )}
          </div>
          {lastUpdate && (
            <div className="mt-3 text-xs text-slate-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* In-Game Chat */}
        <div className="card flex flex-col h-[400px]">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            In-Game Chat
          </h3>
          
          {/* Chat Messages */}
          <div className="flex-1 bg-slate-900 rounded-lg p-4 mb-4 overflow-y-auto">
            {chatHistory.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Send a message to chat in-game</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {chatHistory.map((msg, i) => (
                  <div key={i} className="bg-slate-800 rounded p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="text-primary-400 font-semibold">{msg.username || 'Player'}</span>
                        <p className="text-slate-300 mt-1 text-sm">{msg.message}</p>
                      </div>
                      <span className="text-xs text-slate-500 ml-2">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
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

      {/* Position Info */}
      {data.position && (
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">Current Position</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-slate-400 text-sm">X</p>
              <p className="text-white text-xl font-mono">{Math.round(data.position.x)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Y</p>
              <p className="text-white text-xl font-mono">{Math.round(data.position.y)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Z</p>
              <p className="text-white text-xl font-mono">{Math.round(data.position.z)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
