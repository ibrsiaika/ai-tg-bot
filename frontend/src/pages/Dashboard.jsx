import { Activity, Heart, Apple, Box, Zap } from 'lucide-react'

export default function Dashboard({ data }) {
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
      value: data.systems?.status || 'Idle',
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
