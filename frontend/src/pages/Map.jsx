import { MapPin, Navigation } from 'lucide-react'

export default function Map({ data }) {
  const position = data.position || { x: 0, y: 64, z: 0 }
  
  // Simple 2D representation
  const gridSize = 20
  const cellSize = 30
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Map</h2>
        <p className="text-slate-400 mt-1">Bot location and movement tracking</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">2D View</h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Navigation size={16} />
              <span>Y: {Math.round(position.y)}</span>
            </div>
          </div>
          
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
                    className={`w-[${cellSize}px] h-[${cellSize}px] border border-slate-700 ${
                      isBot ? 'bg-primary-600 animate-pulse' : 'bg-slate-800'
                    }`}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Position Details */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-bold text-white mb-4">Coordinates</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">X (East/West)</label>
                <p className="text-2xl font-mono text-white">{Math.round(position.x)}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400">Y (Height)</label>
                <p className="text-2xl font-mono text-white">{Math.round(position.y)}</p>
              </div>
              <div>
                <label className="text-xs text-slate-400">Z (North/South)</label>
                <p className="text-2xl font-mono text-white">{Math.round(position.z)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-white mb-4">Landmarks</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-green-500" />
                <span className="text-slate-300">Home Base</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-blue-500" />
                <span className="text-slate-300">Mining Site</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-yellow-500" />
                <span className="text-slate-300">Farm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
