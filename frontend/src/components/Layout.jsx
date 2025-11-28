import { Link, useLocation } from 'react-router-dom'
import { Home, Map, Package, Settings, BarChart, Terminal, FileText, Camera, Wifi, WifiOff, Bot } from 'lucide-react'
import clsx from 'clsx'
import { useSocket } from '../hooks/useSocket'

const navigation = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Camera', path: '/camera', icon: Camera },
  { name: 'Map', path: '/map', icon: Map },
  { name: 'Inventory', path: '/inventory', icon: Package },
  { name: 'Systems', path: '/systems', icon: Settings },
  { name: 'Analytics', path: '/analytics', icon: BarChart },
  { name: 'Commands', path: '/commands', icon: Terminal },
  { name: 'Logs', path: '/logs', icon: FileText },
]

export default function Layout({ children, connected }) {
  const location = useLocation()
  const { connectionQuality, lastUpdate, reconnecting } = useSocket()

  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'good': return 'text-primary-400'
      case 'fair': return 'text-yellow-400'
      case 'poor': return 'text-red-400'
      default: return 'text-slate-400'
    }
  }

  const getQualityBg = () => {
    switch (connectionQuality) {
      case 'good': return 'bg-primary-500/10 border-primary-500/30'
      case 'fair': return 'bg-yellow-500/10 border-yellow-500/30'
      case 'poor': return 'bg-red-500/10 border-red-500/30'
      default: return 'bg-slate-700/50 border-slate-600/30'
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-cyber-500">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient-cyber">AI Bot</h1>
              <p className="text-xs text-slate-400">Dashboard v4.2.0</p>
            </div>
          </div>
          
          {/* Connection Status Card */}
          <div className={clsx(
            'mt-4 p-3 rounded-xl transition-all duration-300 border',
            connected ? getQualityBg() : 'bg-red-500/10 border-red-500/30'
          )}>
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className={clsx('w-4 h-4', getQualityColor())} />
              ) : reconnecting ? (
                <Wifi className="w-4 h-4 text-yellow-400 animate-pulse" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              <span className={clsx(
                'text-sm font-medium',
                connected ? getQualityColor() : 'text-red-400'
              )}>
                {connected ? 'Connected' : reconnecting ? 'Reconnecting...' : 'Disconnected'}
              </span>
            </div>
            {connected && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-400">Quality:</span>
                <span className={clsx('capitalize font-medium', getQualityColor())}>
                  {connectionQuality}
                </span>
              </div>
            )}
            {lastUpdate && (
              <p className="text-xs text-slate-500 mt-1">
                Last: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-primary-600 to-cyber-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                )}
                style={isActive ? { boxShadow: '0 0 20px rgba(20, 184, 166, 0.3)' } : {}}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700/50">
          <div className="text-xs text-slate-500 space-y-2">
            <p className="flex items-center justify-between">
              <span>ML Engine</span>
              <span className="px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400">v4.2.0</span>
            </p>
            <p className="flex items-center justify-between">
              <span>Multi-Bot</span>
              <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Enabled</span>
            </p>
            <p className="flex items-center justify-between">
              <span>Analytics</span>
              <span className="px-2 py-0.5 rounded-full bg-cyber-500/10 text-cyber-400">Active</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-grid-cyber">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
