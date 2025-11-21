import { Link, useLocation } from 'react-router-dom'
import { Home, Map, Package, Settings, BarChart, Terminal, FileText } from 'lucide-react'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Map', path: '/map', icon: Map },
  { name: 'Inventory', path: '/inventory', icon: Package },
  { name: 'Systems', path: '/systems', icon: Settings },
  { name: 'Analytics', path: '/analytics', icon: BarChart },
  { name: 'Commands', path: '/commands', icon: Terminal },
  { name: 'Logs', path: '/logs', icon: FileText },
]

export default function Layout({ children, connected }) {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white">AI Bot Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">v4.1.0</p>
          <div className="mt-4 flex items-center">
            <span className={connected ? 'status-online' : 'status-offline'} />
            <span className="text-sm text-slate-300">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
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
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
          <p>ML Engine: v4.1.0</p>
          <p>Multi-Bot Coordination</p>
          <p>Advanced Analytics</p>
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
