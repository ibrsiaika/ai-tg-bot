import { useState } from 'react'
import { Send, Terminal as TerminalIcon } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'

export default function Commands() {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState([])
  const { sendCommand, connected } = useSocket()

  const quickCommands = [
    { name: 'Mine', cmd: 'mine', args: { resource: 'diamond' } },
    { name: 'Farm', cmd: 'farm', args: {} },
    { name: 'Build', cmd: 'build', args: { structure: 'base' } },
    { name: 'Go Home', cmd: 'goHome', args: {} },
    { name: 'Explore', cmd: 'explore', args: {} },
    { name: 'Status', cmd: 'status', args: {} },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!command.trim() || !connected) return

    const newEntry = {
      command,
      timestamp: new Date().toLocaleTimeString(),
      status: 'sent'
    }
    
    setHistory([...history, newEntry])
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
    
    setHistory([...history, newEntry])
    sendCommand(cmd, args)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Commands</h2>
        <p className="text-slate-400 mt-1">Send commands to the bot</p>
      </div>

      {/* Quick Commands */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Quick Commands</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickCommands.map((qc) => (
            <button
              key={qc.name}
              onClick={() => handleQuickCommand(qc.cmd, qc.args)}
              disabled={!connected}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {qc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Command Input */}
      <div className="card">
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
              className="w-full bg-slate-700 text-white rounded-lg pl-11 pr-4 py-3 border border-slate-600 focus:border-primary-500 focus:outline-none disabled:opacity-50"
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
        {!connected && (
          <p className="text-yellow-500 text-sm mt-2">
            ⚠️ Not connected to bot. Commands are disabled.
          </p>
        )}
      </div>

      {/* Command History */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Command History</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {history.slice().reverse().map((entry, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg font-mono text-sm">
              <span className="text-slate-300">{entry.command}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">{entry.timestamp}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  entry.status === 'sent' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                }`}>
                  {entry.status}
                </span>
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-slate-500 text-center py-8">No commands sent yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
