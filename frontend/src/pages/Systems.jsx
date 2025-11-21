import { Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function Systems({ data }) {
  const systems = data.systems || {}
  
  const systemList = [
    { name: 'ML Decision Engine', status: systems.mlEngine || 'offline', critical: false },
    { name: 'Event Bus', status: systems.eventBus || 'online', critical: true },
    { name: 'Pathfinding', status: systems.pathfinding || 'online', critical: true },
    { name: 'Inventory Manager', status: systems.inventory || 'online', critical: true },
    { name: 'Safety Monitor', status: systems.safety || 'online', critical: true },
    { name: 'Combat System', status: systems.combat || 'online', critical: false },
    { name: 'Mining System', status: systems.mining || 'idle', critical: false },
    { name: 'Farming System', status: systems.farming || 'idle', critical: false },
    { name: 'Building System', status: systems.building || 'idle', critical: false },
    { name: 'Telegram Notifier', status: systems.telegram || 'online', critical: false },
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
      case 'active':
        return <CheckCircle className="text-green-500" size={20} />
      case 'offline':
      case 'error':
        return <XCircle className="text-red-500" size={20} />
      case 'idle':
      case 'warning':
        return <AlertCircle className="text-yellow-500" size={20} />
      default:
        return <Activity className="text-gray-500" size={20} />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
      case 'active':
        return 'text-green-500'
      case 'offline':
      case 'error':
        return 'text-red-500'
      case 'idle':
      case 'warning':
        return 'text-yellow-500'
      default:
        return 'text-gray-500'
    }
  }

  const onlineCount = systemList.filter(s => s.status === 'online' || s.status === 'active').length
  const totalCount = systemList.length
  const healthPercentage = Math.round((onlineCount / totalCount) * 100)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Systems</h2>
        <p className="text-slate-400 mt-1">System status and monitoring</p>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-slate-400">System Health</p>
          <p className="text-3xl font-bold text-white mt-1">{healthPercentage}%</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">Online Systems</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{onlineCount}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">Total Systems</p>
          <p className="text-3xl font-bold text-white mt-1">{totalCount}</p>
        </div>
      </div>

      {/* Systems List */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
        <div className="space-y-2">
          {systemList.map((system) => (
            <div
              key={system.name}
              className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(system.status)}
                <div>
                  <p className="text-white font-medium">{system.name}</p>
                  {system.critical && (
                    <p className="text-xs text-slate-400">Critical System</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className={`font-medium capitalize ${getStatusColor(system.status)}`}>
                  {system.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
