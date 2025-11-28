import { Link, useLocation } from 'react-router-dom'
import { Home, Map, Package, Settings, BarChart, Terminal, FileText, Camera, Wifi, WifiOff } from 'lucide-react'
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
      case 'good': return 'text-green-500'
      case 'fair': return 'text-yellow-500'
      case 'poor': return 'text-red-500'
      default: return 'text-slate-400'
    }
  }

  const getQualityBg = () => {
    switch (connectionQuality) {
      case 'good': return 'bg-green-500/10'
      case 'fair': return 'bg-yellow-500/10'
      case 'poor': return 'bg-red-500/10'
      default: return 'bg-slate-700/50'
    }
  }

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white">AI Bot Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">v4.1.0</p>
          
          {/* Connection Status Card */}
          <div className={clsx(
            'mt-4 p-3 rounded-lg transition-all duration-300',
            connected ? getQualityBg() : 'bg-red-500/10'
          )}>
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className={clsx('w-4 h-4', getQualityColor())} />
              ) : reconnecting ? (
                <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className={clsx(
                'text-sm font-medium',
                connected ? getQualityColor() : 'text-red-500'
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
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="text-xs text-slate-500 space-y-1">
            <p className="flex items-center justify-between">
              <span>ML Engine</span>
              <span className="text-primary-400">v4.1.0</span>
            </p>
            <p className="flex items-center justify-between">
              <span>Multi-Bot</span>
              <span className="text-green-400">Enabled</span>
            </p>
            <p className="flex items-center justify-between">
              <span>Analytics</span>
              <span className="text-green-400">Active</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
