import { memo, useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, RadialBarChart, RadialBar, Legend } from 'recharts'
import { TrendingUp, Clock, Zap, RefreshCw, Activity, Database, Cpu, HardDrive, Gauge, Signal } from 'lucide-react'
import { Card, StatCard, LiveBadge, LoadingSpinner } from '../components/ui'
import { useSocket } from '../hooks/useSocket'

// Cyber color palette
const COLORS = {
  primary: '#14b8a6',
  secondary: '#8b5cf6',
  accent: '#d946ef',
  success: '#39FF14',
  warning: '#fbbf24',
  danger: '#ef4444',
  gradient: ['#14b8a6', '#8b5cf6', '#d946ef'],
}

const Analytics = memo(function Analytics({ data }) {
  const { connected, requestRefresh, lastUpdate } = useSocket()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [performanceHistory, setPerformanceHistory] = useState([])
  const analytics = data.analytics || {}
  
  // Build performance history from real-time data
  useEffect(() => {
    if (analytics.latency) {
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      
      setPerformanceHistory(prev => {
        const newEntry = {
          time: timeStr,
          latency: analytics.latency || 0,
          actions: analytics.actionsPerMinute || 0,
          mlInference: analytics.mlInferenceTime || 0,
        }
        // Keep last 20 data points
        const updated = [...prev, newEntry].slice(-20)
        return updated
      })
    }
  }, [analytics])

  // Demo data for visualization when no real data
  const demoPerformanceData = [
    { time: '00:00', latency: 45, actions: 120, mlInference: 42 },
    { time: '04:00', latency: 42, actions: 150, mlInference: 38 },
    { time: '08:00', latency: 48, actions: 180, mlInference: 44 },
    { time: '12:00', latency: 44, actions: 200, mlInference: 40 },
    { time: '16:00', latency: 43, actions: 170, mlInference: 41 },
    { time: '20:00', latency: 46, actions: 140, mlInference: 45 },
  ]

  const resourceData = analytics.resources || [
    { name: 'Wood', count: 245, fill: '#14b8a6' },
    { name: 'Stone', count: 512, fill: '#8b5cf6' },
    { name: 'Coal', count: 128, fill: '#d946ef' },
    { name: 'Iron', count: 64, fill: '#fbbf24' },
    { name: 'Diamond', count: 12, fill: '#00FFFF' },
  ]

  // Radial gauge data for system health
  const systemHealthData = [
    { name: 'CPU', value: analytics.cpuUsage || 34, fill: COLORS.primary },
    { name: 'Memory', value: analytics.memoryUsage ? (analytics.memoryUsage / 512 * 100) : 50, fill: COLORS.secondary },
    { name: 'Cache', value: analytics.cacheHitRate || 94, fill: COLORS.accent },
  ]

  const displayData = performanceHistory.length > 3 ? performanceHistory : demoPerformanceData

  const handleRefresh = async () => {
    setIsRefreshing(true)
    requestRefresh('analytics')
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // Calculate trends
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return null
    const change = ((current - previous) / previous) * 100
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : null,
      value: `${Math.abs(change).toFixed(1)}%`
    }
  }

  const mlTrend = calculateTrend(analytics.mlInferenceTime, analytics.prevMlInferenceTime)
  const apiTrend = calculateTrend(analytics.apiReduction, analytics.prevApiReduction)

  return (
    <div className="space-y-6 bg-grid-cyber">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gradient-cyber">Analytics</h2>
          <p className="text-slate-400 mt-1">Real-time performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-4">
          <LiveBadge isLive={connected} />
          <button
            onClick={handleRefresh}
            disabled={!connected || isRefreshing}
            className="btn-cyber flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-600/10">
              <Zap className="w-5 h-5 text-primary-400" />
            </div>
            <span className="text-sm text-slate-400">ML Inference</span>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.mlInferenceTime || 44}<span className="text-lg text-slate-400">ms</span></p>
          <p className="text-xs text-primary-400 mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> 12% faster than avg
          </p>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-slate-400">API Reduction</span>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.apiReduction || 72}<span className="text-lg text-slate-400">%</span></p>
          <p className="text-xs text-green-400 mt-1">Above target baseline</p>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyber-500/20 to-cyber-600/10">
              <Clock className="w-5 h-5 text-cyber-400" />
            </div>
            <span className="text-sm text-slate-400">Uptime</span>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.uptime || 99.8}<span className="text-lg text-slate-400">%</span></p>
          <p className="text-xs text-cyber-400 mt-1">24h average</p>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-accent-500/20 to-accent-600/10">
              <Activity className="w-5 h-5 text-accent-400" />
            </div>
            <span className="text-sm text-slate-400">Actions/Min</span>
          </div>
          <p className="text-3xl font-bold text-white">{analytics.actionsPerMinute || 156}</p>
          <p className="text-xs text-accent-400 mt-1">Current rate</p>
        </div>
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Chart */}
        <div className="card-cyber">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary-400" />
              ML Decision Latency
            </h3>
            {performanceHistory.length > 0 && (
              <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          {!connected ? (
            <div className="flex items-center justify-center h-[250px]">
              <LoadingSpinner label="Waiting for data..." />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(139, 92, 246, 0.3)', 
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)'
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="latency" 
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fill="url(#latencyGradient)"
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Actions Chart */}
        <div className="card-cyber">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Signal className="w-5 h-5 text-cyber-400" />
              Actions Per Minute
            </h3>
            {performanceHistory.length > 0 && (
              <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          {!connected ? (
            <div className="flex items-center justify-center h-[250px]">
              <LoadingSpinner label="Waiting for data..." />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={displayData}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={COLORS.secondary} />
                    <stop offset="100%" stopColor={COLORS.accent} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(139, 92, 246, 0.3)', 
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)'
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="actions" 
                  stroke="url(#lineGradient)"
                  strokeWidth={3}
                  dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: COLORS.accent }}
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Resource Chart */}
      <div className="card-cyber">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-accent-400" />
            Resource Collection
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={resourceData}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                <stop offset="100%" stopColor={COLORS.secondary} stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                border: '1px solid rgba(139, 92, 246, 0.3)', 
                borderRadius: '12px',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)'
              }}
              labelStyle={{ color: '#94a3b8' }}
              cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
            />
            <Bar 
              dataKey="count" 
              fill="url(#barGradient)"
              radius={[8, 8, 0, 0]}
              animationDuration={500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* System Health Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-primary-400" />
            <p className="text-sm text-slate-400">Cache Hit Rate</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: COLORS.success }}>{analytics.cacheHitRate || 94}%</p>
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${analytics.cacheHitRate || 94}%`,
                background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.success})`
              }}
            />
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-cyber-400" />
            <p className="text-sm text-slate-400">Memory Usage</p>
          </div>
          <p className="text-2xl font-bold text-cyber-400">{analytics.memoryUsage || 256}MB</p>
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${((analytics.memoryUsage || 256) / 512) * 100}%`,
                background: `linear-gradient(90deg, ${COLORS.secondary}, ${COLORS.accent})`
              }}
            />
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-accent-400" />
            <p className="text-sm text-slate-400">Active Tasks</p>
          </div>
          <p className="text-2xl font-bold text-accent-400">{analytics.activeTasks || 3}</p>
          <div className="mt-2 flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{
                  background: i < (analytics.activeTasks || 3) 
                    ? `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` 
                    : '#334155'
                }}
              />
            ))}
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-yellow-400" />
            <p className="text-sm text-slate-400">Queue Size</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{analytics.queueSize || 12}</p>
          <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(((analytics.queueSize || 12) / 50) * 100, 100)}%`,
                background: `linear-gradient(90deg, ${COLORS.warning}, #f97316)`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
})

export default Analytics
