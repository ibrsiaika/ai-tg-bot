import { useState, useEffect } from 'react'
import { Filter, Download } from 'lucide-react'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('all')
  const [autoScroll, setAutoScroll] = useState(true)

  const logLevels = ['all', 'info', 'warning', 'error', 'debug']

  const mockLogs = [
    { level: 'info', message: 'Bot connected to server', timestamp: new Date().toISOString() },
    { level: 'info', message: 'ML Engine initialized successfully', timestamp: new Date().toISOString() },
    { level: 'info', message: 'Event Bus started', timestamp: new Date().toISOString() },
    { level: 'warning', message: 'Low food level detected', timestamp: new Date().toISOString() },
    { level: 'info', message: 'Mining iron ore', timestamp: new Date().toISOString() },
    { level: 'debug', message: 'Cache hit: action prediction', timestamp: new Date().toISOString() },
  ]

  useEffect(() => {
    // Simulate real-time logs
    const interval = setInterval(() => {
      const newLog = {
        level: 'info',
        message: `Action performed at ${new Date().toLocaleTimeString()}`,
        timestamp: new Date().toISOString()
      }
      setLogs(prev => [...prev, newLog].slice(-100))
    }, 5000)

    // Set initial mock logs
    setLogs(mockLogs)

    return () => clearInterval(interval)
  }, [])

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter)

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-900/30'
      case 'warning': return 'text-yellow-400 bg-yellow-900/30'
      case 'info': return 'text-blue-400 bg-blue-900/30'
      case 'debug': return 'text-gray-400 bg-gray-900/30'
      default: return 'text-slate-400 bg-slate-900/30'
    }
  }

  const handleDownload = () => {
    const content = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bot-logs-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Logs</h2>
        <p className="text-slate-400 mt-1">Real-time bot activity logs</p>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter size={20} className="text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-700 text-white rounded-lg px-4 py-2 border border-slate-600 focus:border-primary-500 focus:outline-none"
            >
              {logLevels.map(level => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
            <button
              onClick={handleDownload}
              className="btn-secondary flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Log Display */}
      <div className="card">
        <div className="space-y-1 max-h-[600px] overflow-y-auto font-mono text-sm">
          {filteredLogs.map((log, i) => (
            <div key={i} className="flex items-start gap-3 p-2 hover:bg-slate-700 rounded">
              <span className="text-slate-500 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold whitespace-nowrap ${getLevelColor(log.level)}`}>
                {log.level}
              </span>
              <span className="text-slate-300 flex-1">{log.message}</span>
            </div>
          ))}
          {filteredLogs.length === 0 && (
            <p className="text-slate-500 text-center py-8">No logs to display</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-slate-400">Total Logs</p>
          <p className="text-2xl font-bold text-white mt-1">{logs.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">Errors</p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {logs.filter(l => l.level === 'error').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">Warnings</p>
          <p className="text-2xl font-bold text-yellow-500 mt-1">
            {logs.filter(l => l.level === 'warning').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">Info</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">
            {logs.filter(l => l.level === 'info').length}
          </p>
        </div>
      </div>
    </div>
  )
}
