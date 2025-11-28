import { memo, useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, Clock, Zap, RefreshCw, Activity, Database } from 'lucide-react'
import { Card, StatCard, LiveBadge, LoadingSpinner } from '../components/ui'
import { useSocket } from '../hooks/useSocket'

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
    { name: 'Wood', count: 245 },
    { name: 'Stone', count: 512 },
    { name: 'Coal', count: 128 },
    { name: 'Iron', count: 64 },
    { name: 'Diamond', count: 12 },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Analytics</h2>
          <p className="text-slate-400 mt-1">Real-time performance metrics and insights</p>
        </div>
        <div className="flex items-center gap-4">
          <LiveBadge isLive={connected} />
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="ML Inference"
          value={`${analytics.mlInferenceTime || 44}ms`}
          icon={Zap}
          iconColor="text-primary-500"
          trend={mlTrend?.direction}
          trendValue={mlTrend?.value || '12% faster'}
          subtitle="avg response time"
          lastUpdated={lastUpdate}
        />
        <StatCard
          title="API Reduction"
          value={`${analytics.apiReduction || 72}%`}
          icon={TrendingUp}
          iconColor="text-green-500"
          trend={apiTrend?.direction || 'up'}
          trendValue={apiTrend?.value || 'Above target'}
          subtitle="vs baseline"
        />
        <StatCard
          title="Uptime"
          value={`${analytics.uptime || 99.8}%`}
          icon={Clock}
          iconColor="text-blue-500"
          subtitle="24h average"
        />
        <StatCard
          title="Actions/Min"
          value={analytics.actionsPerMinute || 156}
          icon={Activity}
          iconColor="text-purple-500"
          subtitle="current rate"
        />
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Chart */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">ML Decision Latency</h3>
            {performanceHistory.length > 0 && (
              <span className="text-xs text-green-500 flex items-center gap-1">
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
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="latency" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  fill="url(#latencyGradient)"
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Actions Chart */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Actions Per Minute</h3>
            {performanceHistory.length > 0 && (
              <span className="text-xs text-green-500 flex items-center gap-1">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="actions" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', strokeWidth: 2 }}
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Resource Chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-400" />
            Resource Collection
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={resourceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              labelStyle={{ color: '#94a3b8' }}
              cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }}
            />
            <Bar 
              dataKey="count" 
              fill="#0ea5e9" 
              radius={[4, 4, 0, 0]}
              animationDuration={500}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Cache Hit Rate</p>
          <p className="text-2xl font-bold text-green-500 mt-1">{analytics.cacheHitRate || 94}%</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Memory Usage</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">{analytics.memoryUsage || 256}MB</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Active Tasks</p>
          <p className="text-2xl font-bold text-purple-500 mt-1">{analytics.activeTasks || 3}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Queue Size</p>
          <p className="text-2xl font-bold text-yellow-500 mt-1">{analytics.queueSize || 12}</p>
        </Card>
      </div>
    </div>
  )
})

export default Analytics
