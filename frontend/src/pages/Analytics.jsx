import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Clock, Zap } from 'lucide-react'

export default function Analytics({ data }) {
  const analytics = data.analytics || {}
  
  // Mock data for demonstration
  const performanceData = [
    { time: '00:00', latency: 45, actions: 120 },
    { time: '04:00', latency: 42, actions: 150 },
    { time: '08:00', latency: 48, actions: 180 },
    { time: '12:00', latency: 44, actions: 200 },
    { time: '16:00', latency: 43, actions: 170 },
    { time: '20:00', latency: 46, actions: 140 },
  ]

  const resourceData = [
    { name: 'Wood', count: 245 },
    { name: 'Stone', count: 512 },
    { name: 'Coal', count: 128 },
    { name: 'Iron', count: 64 },
    { name: 'Diamond', count: 12 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Analytics</h2>
        <p className="text-slate-400 mt-1">Performance metrics and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">ML Inference</p>
              <p className="text-3xl font-bold text-white mt-1">44ms</p>
              <p className="text-xs text-green-500 mt-1">↓ 12% faster</p>
            </div>
            <Zap className="text-primary-500 w-10 h-10" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">API Reduction</p>
              <p className="text-3xl font-bold text-white mt-1">72%</p>
              <p className="text-xs text-green-500 mt-1">↑ Above target</p>
            </div>
            <TrendingUp className="text-green-500 w-10 h-10" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Uptime</p>
              <p className="text-3xl font-bold text-white mt-1">99.8%</p>
              <p className="text-xs text-green-500 mt-1">24h average</p>
            </div>
            <Clock className="text-blue-500 w-10 h-10" />
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">ML Decision Latency</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Line type="monotone" dataKey="latency" stroke="#0ea5e9" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Resource Chart */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Resource Collection</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={resourceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="count" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
