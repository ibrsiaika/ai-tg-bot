import { useState, useEffect, useRef, memo } from 'react'
import { Filter, Download, RefreshCw, Trash2 } from 'lucide-react'
import { Card, LiveBadge, LoadingSpinner } from '../components/ui'
import { useSocket } from '../hooks/useSocket'

const LogEntry = memo(function LogEntry({ log }) {
  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-900/30'
      case 'warning': return 'text-yellow-400 bg-yellow-900/30'
      case 'info': return 'text-blue-400 bg-blue-900/30'
      case 'debug': return 'text-gray-400 bg-gray-900/30'
      default: return 'text-slate-400 bg-slate-900/30'
    }
  }

  return (
    <div className="flex items-start gap-3 p-2 hover:bg-slate-700 rounded animate-fadeIn">
      <span className="text-slate-500 whitespace-nowrap">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold whitespace-nowrap ${getLevelColor(log.level)}`}>
        {log.level}
      </span>
      <span className="text-slate-300 flex-1 break-words">{log.message}</span>
    </div>
  )
})

export default function Logs() {
  const { connected, data, clearLogs, lastUpdate } = useSocket()
  const [filter, setFilter] = useState('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logContainerRef = useRef(null)
  const logs = data.logs || []

  const logLevels = ['all', 'info', 'warning', 'error', 'debug']

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter)

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

  const handleClearLogs = () => {
    if (window.confirm('Clear all logs?')) {
      clearLogs()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Logs</h2>
          <p className="text-slate-400 mt-1">Real-time bot activity logs</p>
        </div>
        <LiveBadge isLive={connected} />
      </div>

      {/* Controls */}
      <Card className="!p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
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
            <span className="text-xs text-slate-500">
              {filteredLogs.length} logs
            </span>
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
              onClick={handleClearLogs}
              className="btn-secondary flex items-center gap-2"
              title="Clear logs"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={handleDownload}
              className="btn-secondary flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>
      </Card>

      {/* Log Display */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Log Stream</h3>
          {lastUpdate && (
            <span className="text-xs text-slate-500">
              Last update: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div 
          ref={logContainerRef}
          className="space-y-1 max-h-[500px] overflow-y-auto font-mono text-sm"
        >
          {!connected && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <LoadingSpinner size="lg" label="Waiting for connection..." />
            </div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No logs to display</p>
          ) : (
            filteredLogs.map((log, i) => (
              <LogEntry key={`${log.timestamp}-${i}`} log={log} />
            ))
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Total Logs</p>
          <p className="text-2xl font-bold text-white mt-1">{logs.length}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Errors</p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {logs.filter(l => l.level === 'error').length}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Warnings</p>
          <p className="text-2xl font-bold text-yellow-500 mt-1">
            {logs.filter(l => l.level === 'warning').length}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Info</p>
          <p className="text-2xl font-bold text-blue-500 mt-1">
            {logs.filter(l => l.level === 'info').length}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Debug</p>
          <p className="text-2xl font-bold text-gray-500 mt-1">
            {logs.filter(l => l.level === 'debug').length}
          </p>
        </Card>
      </div>
    </div>
  )
}
