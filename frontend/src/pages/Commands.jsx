import { useState, memo } from 'react'
import { Send, Terminal as TerminalIcon, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Card, LiveBadge } from '../components/ui'
import { useSocket } from '../hooks/useSocket'

const CommandHistoryItem = memo(function CommandHistoryItem({ entry }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg font-mono text-sm animate-fadeIn hover:bg-slate-600 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {entry.status === 'sent' ? (
          <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
        ) : (
          <XCircle size={16} className="text-red-500 flex-shrink-0" />
        )}
        <span className="text-slate-300 truncate">{entry.command}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-slate-500 flex items-center gap-1">
          <Clock size={12} />
          {entry.timestamp}
        </span>
        <span className={`text-xs px-2 py-1 rounded ${
          entry.status === 'sent' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
        }`}>
          {entry.status}
        </span>
      </div>
    </div>
  )
})

const QuickCommandButton = memo(function QuickCommandButton({ name, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
    >
      {name}
    </button>
  )
})

export default function Commands() {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState([])
  const { sendCommand, connected, connectionQuality } = useSocket()

  const quickCommands = [
    { name: 'Mine Diamond', cmd: 'mine', args: { resource: 'diamond' } },
    { name: 'Mine Iron', cmd: 'mine', args: { resource: 'iron' } },
    { name: 'Farm', cmd: 'farm', args: {} },
    { name: 'Build Base', cmd: 'build', args: { structure: 'base' } },
    { name: 'Go Home', cmd: 'goHome', args: {} },
    { name: 'Explore', cmd: 'explore', args: {} },
    { name: 'Status', cmd: 'status', args: {} },
    { name: 'Stop', cmd: 'stop', args: {} },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!command.trim() || !connected) return

    const newEntry = {
      command,
      timestamp: new Date().toLocaleTimeString(),
      status: 'sent'
    }
    
    setHistory(prev => [newEntry, ...prev])
    sendCommand(command)
    setCommand('')
  }

  const handleQuickCommand = (cmd, args) => {
    if (!connected) return
    
    const newEntry = {
      command: `${cmd} ${JSON.stringify(args)}`,
      timestamp: new Date().toLocaleTimeString(),
      status: 'sent'
    }
    
    setHistory(prev => [newEntry, ...prev])
    sendCommand(cmd, args)
  }

  const clearHistory = () => {
    if (window.confirm('Clear command history?')) {
      setHistory([])
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Commands</h2>
          <p className="text-slate-400 mt-1">Send commands to the bot</p>
        </div>
        <LiveBadge isLive={connected} />
      </div>

      {/* Connection Warning */}
      {!connected && (
        <Card variant="warning" className="!p-4">
          <div className="flex items-center gap-3">
            <XCircle className="text-yellow-500" size={20} />
            <div>
              <p className="text-white font-medium">Not connected to bot</p>
              <p className="text-xs text-slate-400">Commands are disabled until connection is restored</p>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Commands */}
      <Card>
        <h3 className="text-xl font-bold text-white mb-4">Quick Commands</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {quickCommands.map((qc) => (
            <QuickCommandButton
              key={qc.name}
              name={qc.name}
              onClick={() => handleQuickCommand(qc.cmd, qc.args)}
              disabled={!connected}
            />
          ))}
        </div>
      </Card>

      {/* Command Input */}
      <Card>
        <h3 className="text-xl font-bold text-white mb-4">Custom Command</h3>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <TerminalIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command..."
              disabled={!connected}
              className="w-full bg-slate-700 text-white rounded-lg pl-11 pr-4 py-3 border border-slate-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!connected || !command.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
            Send
          </button>
        </form>
        {connected && connectionQuality && (
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              connectionQuality === 'good' ? 'bg-green-500' :
              connectionQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            Connection quality: {connectionQuality}
          </p>
        )}
      </Card>

      {/* Command History */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Command History</h3>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear history
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {history.map((entry, i) => (
            <CommandHistoryItem key={`${entry.timestamp}-${i}`} entry={entry} />
          ))}
          {history.length === 0 && (
            <div className="text-center py-12">
              <TerminalIcon size={48} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No commands sent yet</p>
              <p className="text-xs text-slate-600 mt-1">Use quick commands or type a custom command</p>
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Total Commands</p>
          <p className="text-2xl font-bold text-white mt-1">{history.length}</p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Successful</p>
          <p className="text-2xl font-bold text-green-500 mt-1">
            {history.filter(h => h.status === 'sent').length}
          </p>
        </Card>
        <Card className="!p-4">
          <p className="text-sm text-slate-400">Failed</p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {history.filter(h => h.status !== 'sent').length}
          </p>
        </Card>
      </div>
    </div>
  )
}
