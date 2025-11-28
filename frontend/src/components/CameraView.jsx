import { Camera, Compass, Heart, Apple, AlertTriangle, Users, Eye, Crosshair, Wind, Sun, Moon, CloudRain } from 'lucide-react'
import { useState, useEffect } from 'react'

/**
 * CameraView Component - Live visualization of what the bot sees
 * Replaces the old screenshot system with real-time camera data
 */
export default function CameraView({ cameraData, compact = false }) {
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    if (cameraData?.timestamp) {
      setLastUpdate(new Date(cameraData.timestamp))
    }
  }, [cameraData])

  if (!cameraData) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-500 py-8">
        <Camera className="w-16 h-16 mb-4 opacity-50 animate-pulse" />
        <p className="text-sm">Waiting for camera data...</p>
        <p className="text-xs mt-2">Updates every 2 seconds</p>
      </div>
    )
  }

  const { bot, environment, view } = cameraData
  const threats = view?.threats || []
  const hasHighThreat = threats.some(t => t.severity === 'high')
  const hasMediumThreat = threats.some(t => t.severity === 'medium')

  // Get time icon
  const TimeIcon = environment?.isDay ? Sun : Moon

  // Block color mapping for mini-map
  const getBlockColor = (blockName) => {
    const colors = {
      grass_block: '#7cb342',
      dirt: '#8d6e63',
      stone: '#9e9e9e',
      cobblestone: '#757575',
      water: '#42a5f5',
      sand: '#ffeb3b',
      gravel: '#9e9e9e',
      oak_log: '#795548',
      oak_planks: '#a1887f',
      oak_leaves: '#4caf50',
      spruce_log: '#4e342e',
      birch_log: '#d7ccc8',
      coal_ore: '#424242',
      iron_ore: '#bcaaa4',
      gold_ore: '#ffc107',
      diamond_ore: '#00bcd4',
      lava: '#ff5722',
      fire: '#ff9800',
      bedrock: '#37474f',
      default: '#607d8b'
    }
    return colors[blockName] || colors.default
  }

  // Entity icon/color mapping
  const getEntityStyle = (entity) => {
    if (entity.hostile) {
      return { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' }
    }
    if (entity.type === 'player') {
      return { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' }
    }
    return { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' }
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Compact Bot Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Heart className={`w-4 h-4 ${bot?.health < 10 ? 'text-red-400' : 'text-green-400'}`} />
              <span className="text-white font-mono">{Math.round(bot?.health || 0)}/20</span>
            </div>
            <div className="flex items-center gap-2">
              <Apple className={`w-4 h-4 ${bot?.food < 10 ? 'text-yellow-400' : 'text-green-400'}`} />
              <span className="text-white font-mono">{Math.round(bot?.food || 0)}/20</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Compass className="w-4 h-4" />
            <span>{bot?.rotation?.direction || 'N/A'}</span>
          </div>
        </div>

        {/* Threats */}
        {threats.length > 0 && (
          <div className={`flex items-center gap-2 p-2 rounded ${hasHighThreat ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
            <AlertTriangle className={`w-4 h-4 ${hasHighThreat ? 'text-red-400' : 'text-yellow-400'}`} />
            <span className="text-sm text-white">
              {threats[0].name} ({threats[0].distance}m)
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with last update */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary-400" />
          Bot Camera View
        </h3>
        {lastUpdate && (
          <span className="text-xs text-slate-500">
            Updated: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Bot Status Bar */}
      <div className="bg-slate-900 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Health */}
          <div className="flex items-center gap-3">
            <Heart className={`w-6 h-6 ${bot?.health < 10 ? 'text-red-400 animate-pulse' : 'text-green-400'}`} />
            <div>
              <p className="text-xs text-slate-400">Health</p>
              <p className="text-white font-bold">{Math.round(bot?.health || 0)}/20</p>
            </div>
          </div>
          
          {/* Food */}
          <div className="flex items-center gap-3">
            <Apple className={`w-6 h-6 ${bot?.food < 10 ? 'text-yellow-400' : 'text-green-400'}`} />
            <div>
              <p className="text-xs text-slate-400">Food</p>
              <p className="text-white font-bold">{Math.round(bot?.food || 0)}/20</p>
            </div>
          </div>

          {/* Direction */}
          <div className="flex items-center gap-3">
            <Compass className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-xs text-slate-400">Facing</p>
              <p className="text-white font-bold">{bot?.rotation?.direction || 'N/A'}</p>
            </div>
          </div>

          {/* Environment */}
          <div className="flex items-center gap-3">
            {environment?.raining ? (
              <CloudRain className="w-6 h-6 text-blue-400" />
            ) : (
              <TimeIcon className={`w-6 h-6 ${environment?.isDay ? 'text-yellow-400' : 'text-purple-400'}`} />
            )}
            <div>
              <p className="text-xs text-slate-400">Time</p>
              <p className="text-white font-bold">
                {environment?.isDay ? 'Day' : 'Night'}
                {environment?.raining && ' 🌧️'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Position & Velocity */}
      <div className="bg-slate-900 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crosshair className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-semibold text-white">Position & Movement</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Coordinates</p>
            <p className="text-white font-mono text-sm">
              X: {bot?.position?.x?.toFixed(1)} Y: {bot?.position?.y?.toFixed(1)} Z: {bot?.position?.z?.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Velocity</p>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-slate-400" />
              <p className="text-white font-mono text-sm">
                {Math.sqrt(
                  Math.pow(bot?.velocity?.x || 0, 2) + 
                  Math.pow(bot?.velocity?.z || 0, 2)
                ).toFixed(2)} m/s
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Threats Section */}
      {threats.length > 0 && (
        <div className={`rounded-lg p-4 ${hasHighThreat ? 'bg-red-500/20 border border-red-500/50' : hasMediumThreat ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-slate-900'}`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className={`w-5 h-5 ${hasHighThreat ? 'text-red-400' : 'text-yellow-400'}`} />
            <span className="font-semibold text-white">Active Threats ({threats.length})</span>
          </div>
          <div className="space-y-2">
            {threats.slice(0, 5).map((threat, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className={`${
                  threat.severity === 'high' ? 'text-red-400' : 
                  threat.severity === 'medium' ? 'text-yellow-400' : 'text-slate-400'
                }`}>
                  {threat.name}
                </span>
                <span className="text-slate-500">
                  {threat.distance > 0 ? `${threat.distance}m` : 'Status'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nearby Entities */}
        <div className="bg-slate-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-semibold text-white">
              Nearby Entities ({view?.nearbyEntities?.length || 0})
            </span>
          </div>
          {view?.nearbyEntities?.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {view.nearbyEntities.slice(0, 10).map((entity, i) => {
                const style = getEntityStyle(entity)
                return (
                  <div key={i} className={`flex items-center justify-between p-2 rounded ${style.bg} border ${style.border}`}>
                    <span className={`text-sm ${style.text}`}>{entity.name}</span>
                    <span className="text-xs text-slate-400">{entity.distance}m</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">No entities nearby</p>
          )}
        </div>

        {/* Nearby Players */}
        <div className="bg-slate-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">
              Nearby Players ({view?.nearbyPlayers?.length || 0})
            </span>
          </div>
          {view?.nearbyPlayers?.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {view.nearbyPlayers.map((player, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-blue-500/20 border border-blue-500/50">
                  <span className="text-sm text-blue-400">{player.username}</span>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">{player.distance}m</span>
                    {player.ping && (
                      <span className="text-xs text-slate-500 ml-2">{player.ping}ms</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">No players nearby</p>
          )}
        </div>
      </div>

      {/* Ground View Mini-Map */}
      <div className="bg-slate-900 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Compass className="w-4 h-4 text-primary-400" />
          <span className="text-sm font-semibold text-white">Ground View (8 block radius)</span>
        </div>
        <div className="flex justify-center">
          <div className="relative" style={{ width: '272px', height: '272px' }}>
            {/* Grid background */}
            <div className="absolute inset-0 grid grid-cols-17 gap-px bg-slate-700 rounded-lg overflow-hidden">
              {view?.groundBlocks?.map((block, i) => (
                <div
                  key={i}
                  className="w-4 h-4"
                  style={{ backgroundColor: getBlockColor(block.name) }}
                  title={`${block.name} (${block.relX}, ${block.relZ})`}
                />
              )) || Array(289).fill(null).map((_, i) => (
                <div key={i} className="w-4 h-4 bg-slate-800" />
              ))}
            </div>
            {/* Bot position indicator (center) */}
            <div 
              className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"
              style={{ 
                left: '50%', 
                top: '50%', 
                transform: 'translate(-50%, -50%)'
              }}
            />
            {/* Direction arrow */}
            <div 
              className="absolute w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-yellow-400"
              style={{ 
                left: '50%', 
                top: 'calc(50% - 12px)', 
                transform: `translateX(-50%) rotate(${(bot?.rotation?.yaw || 0) * 180 / Math.PI}deg)`,
                transformOrigin: 'center bottom'
              }}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 text-center mt-2">
          Blue dot = Bot position | Arrow = Facing direction
        </p>
      </div>

      {/* Environment Info */}
      <div className="bg-slate-900 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400">Dimension</p>
            <p className="text-white capitalize">{environment?.dimension || 'Overworld'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Biome</p>
            <p className="text-white capitalize">{environment?.biome?.replace(/_/g, ' ') || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">On Ground</p>
            <p className="text-white">{bot?.isOnGround ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
