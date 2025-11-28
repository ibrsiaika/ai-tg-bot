import { memo, useEffect, useState } from 'react'
import { RefreshCw, Activity, Wifi, WifiOff } from 'lucide-react'
import { Card, StatCard, SystemStatusCard, LiveBadge, LoadingSpinner } from '../components/ui'
import { useSocket } from '../hooks/useSocket'

const Systems = memo(function Systems({ data }) {
  const { connected, connectionQuality, requestRefresh, lastUpdate, reconnecting } = useSocket()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const systems = data.systems || {}
  
  const systemList = [
    { name: 'ML Decision Engine', key: 'mlEngine', status: systems.mlEngine || 'offline', critical: false, description: 'AI-powered decision making' },
    { name: 'Event Bus', key: 'eventBus', status: systems.eventBus || 'online', critical: true, description: 'Core message routing' },
    { name: 'Pathfinding', key: 'pathfinding', status: systems.pathfinding || 'online', critical: true, description: 'Navigation system' },
    { name: 'Inventory Manager', key: 'inventory', status: systems.inventory || 'online', critical: true, description: 'Item management' },
    { name: 'Safety Monitor', key: 'safety', status: systems.safety || 'online', critical: true, description: 'Threat detection' },
    { name: 'Combat System', key: 'combat', status: systems.combat || 'online', critical: false, description: 'Battle management' },
    { name: 'Mining System', key: 'mining', status: systems.mining || 'idle', critical: false, description: 'Resource extraction' },
    { name: 'Farming System', key: 'farming', status: systems.farming || 'idle', critical: false, description: 'Crop automation' },
    { name: 'Building System', key: 'building', status: systems.building || 'idle', critical: false, description: 'Construction tasks' },
    { name: 'Telegram Notifier', key: 'telegram', status: systems.telegram || 'online', critical: false, description: 'Alert notifications' },
  ]

  const onlineCount = systemList.filter(s => s.status === 'online' || s.status === 'active').length
  const totalCount = systemList.length
  const healthPercentage = Math.round((onlineCount / totalCount) * 100)
  const criticalOnline = systemList.filter(s => s.critical && (s.status === 'online' || s.status === 'active')).length
  const criticalTotal = systemList.filter(s => s.critical).length

  const handleRefresh = async () => {
    setIsRefreshing(true)
    requestRefresh('systems')
    // Simulate minimum refresh time for UX
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Get connection quality color
  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'good': return 'text-green-500'
      case 'fair': return 'text-yellow-500'
      case 'poor': return 'text-red-500'
      default: return 'text-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Systems</h2>
          <p className="text-slate-400 mt-1">Real-time system status and monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <LiveBadge isLive={connected} label={connected ? 'LIVE' : 'OFFLINE'} />
          <button
            onClick={handleRefresh}
            disabled={!connected || isRefreshing}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Connection Status Bar */}
      <Card variant={connected ? 'success' : 'danger'} className="!p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {connected ? (
              <Wifi className="text-green-500" size={20} />
            ) : reconnecting ? (
              <LoadingSpinner size="sm" />
            ) : (
              <WifiOff className="text-red-500" size={20} />
            )}
            <div>
              <p className="text-white font-medium">
                {connected ? 'Connected to Bot' : reconnecting ? 'Reconnecting...' : 'Disconnected'}
              </p>
              {lastUpdate && (
                <p className="text-xs text-slate-400">
                  Last update: {new Date(lastUpdate).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          {connected && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Quality:</span>
              <span className={`text-sm font-medium capitalize ${getQualityColor()}`}>
                {connectionQuality}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* System Health Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="System Health"
          value={`${healthPercentage}%`}
          icon={Activity}
          iconColor={healthPercentage >= 80 ? 'text-green-500' : healthPercentage >= 50 ? 'text-yellow-500' : 'text-red-500'}
          subtitle={healthPercentage >= 80 ? 'Healthy' : healthPercentage >= 50 ? 'Degraded' : 'Critical'}
          variant={healthPercentage >= 80 ? 'success' : healthPercentage >= 50 ? 'warning' : 'danger'}
        />
        <StatCard
          title="Online Systems"
          value={onlineCount}
          icon={Activity}
          iconColor="text-green-500"
          subtitle={`of ${totalCount} total`}
        />
        <StatCard
          title="Critical Systems"
          value={`${criticalOnline}/${criticalTotal}`}
          icon={Activity}
          iconColor={criticalOnline === criticalTotal ? 'text-green-500' : 'text-red-500'}
          subtitle={criticalOnline === criticalTotal ? 'All operational' : 'Issues detected'}
          variant={criticalOnline === criticalTotal ? 'success' : 'danger'}
        />
        <StatCard
          title="Idle Systems"
          value={systemList.filter(s => s.status === 'idle').length}
          icon={Activity}
          iconColor="text-yellow-500"
          subtitle="Waiting for tasks"
        />
      </div>

      {/* Systems Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">System Status</h3>
          <span className="text-xs text-slate-500">
            Auto-refreshes every 5 seconds
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systemList.map((system) => (
            <SystemStatusCard
              key={system.key}
              name={system.name}
              status={system.status}
              description={system.description}
              critical={system.critical}
              lastUpdate={data.timestamps?.systems}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <Card className="!p-4">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-400">Online/Active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-slate-400">Idle/Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-400">Offline/Error</span>
          </div>
        </div>
      </Card>
    </div>
  )
})

export default Systems
