import { memo } from 'react'
import { MapPin, Navigation, Compass, RefreshCw } from 'lucide-react'
import { Card, StatCard, LiveBadge } from '../components/ui'
import { useSocket } from '../hooks/useSocket'

const MapGrid = memo(function MapGrid({ position }) {
  const gridSize = 20
  const cellSize = 30
  
  return (
    <div className="bg-slate-900 rounded-lg p-4 overflow-auto">
      <div 
        className="grid gap-0.5 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
          width: 'fit-content'
        }}
      >
        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
          const row = Math.floor(i / gridSize)
          const col = i % gridSize
          const centerRow = Math.floor(gridSize / 2)
          const centerCol = Math.floor(gridSize / 2)
          const isBot = row === centerRow && col === centerCol
          
          return (
            <div
              key={i}
              style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
              className={`border border-slate-700 transition-all duration-200 ${
                isBot 
                  ? 'bg-primary-600 animate-pulse shadow-lg shadow-primary-600/50' 
                  : 'bg-slate-800 hover:bg-slate-700'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
})

export default function Map({ data }) {
  const { connected, requestRefresh, lastUpdate } = useSocket()
  const position = data.position || { x: 0, y: 64, z: 0 }
  
  const handleRefresh = () => {
    requestRefresh('all')
  }
  
  // Calculate chunk coordinates
  const chunkX = Math.floor(position.x / 16)
  const chunkZ = Math.floor(position.z / 16)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Map</h2>
          <p className="text-slate-400 mt-1">Bot location and movement tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <LiveBadge isLive={connected} />
          <button
            onClick={handleRefresh}
            disabled={!connected}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary-400" />
                2D View
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Navigation size={16} />
                <span>Y: {Math.round(position.y)}</span>
              </div>
            </div>
            
            <MapGrid position={position} />
            
            <div className="mt-4 flex items-center justify-center gap-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary-600 rounded animate-pulse" />
                <span>Bot Position</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-slate-700 border border-slate-600 rounded" />
                <span>Terrain</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Position Details */}
        <div className="space-y-6">
          <Card>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-400" />
              Coordinates
            </h3>
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-lg p-3">
                <label className="text-xs text-slate-400">X (East/West)</label>
                <p className="text-2xl font-mono text-white">{Math.round(position.x)}</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <label className="text-xs text-slate-400">Y (Height)</label>
                <p className="text-2xl font-mono text-white">{Math.round(position.y)}</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3">
                <label className="text-xs text-slate-400">Z (North/South)</label>
                <p className="text-2xl font-mono text-white">{Math.round(position.z)}</p>
              </div>
            </div>
            {lastUpdate && (
              <p className="text-xs text-slate-500 mt-4">
                Updated: {new Date(lastUpdate).toLocaleTimeString()}
              </p>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-bold text-white mb-4">Chunk Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">Chunk X</p>
                <p className="text-xl font-mono text-white">{chunkX}</p>
              </div>
              <div className="bg-slate-900 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">Chunk Z</p>
                <p className="text-xl font-mono text-white">{chunkZ}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold text-white mb-4">Landmarks</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-green-500" />
                  <span className="text-slate-300">Home Base</span>
                </div>
                <span className="text-xs text-slate-500">0, 64, 0</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500" />
                  <span className="text-slate-300">Mining Site</span>
                </div>
                <span className="text-xs text-slate-500">50, 12, 30</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-yellow-500" />
                  <span className="text-slate-300">Farm</span>
                </div>
                <span className="text-xs text-slate-500">-20, 65, 40</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
