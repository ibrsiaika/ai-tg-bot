import { Package, Grid } from 'lucide-react'

export default function Inventory({ data }) {
  const inventory = data.inventory || []
  const totalSlots = 36
  const usedSlots = inventory.length
  const freeSlots = totalSlots - usedSlots

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white">Inventory</h2>
        <p className="text-slate-400 mt-1">Items and equipment management</p>
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-slate-400">Total Slots</p>
          <p className="text-3xl font-bold text-white mt-1">{totalSlots}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">Used Slots</p>
          <p className="text-3xl font-bold text-primary-500 mt-1">{usedSlots}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-400">Free Slots</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{freeSlots}</p>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Grid size={20} className="text-white" />
          <h3 className="text-xl font-bold text-white">Items</h3>
        </div>
        
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
          {Array.from({ length: totalSlots }).map((_, i) => {
            const item = inventory[i]
            return (
              <div
                key={i}
                className={`aspect-square border rounded-lg flex items-center justify-center ${
                  item
                    ? 'bg-slate-700 border-slate-600'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                {item && (
                  <div className="text-center p-2">
                    <Package size={20} className="text-primary-500 mx-auto" />
                    <p className="text-xs text-slate-300 mt-1 truncate">{item.name || `Item ${i}`}</p>
                    {item.count && (
                      <p className="text-xs text-slate-500">×{item.count}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Item List */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Item List</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {inventory.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Package size={20} className="text-primary-500" />
                <span className="text-slate-300">{item.name || `Item ${i}`}</span>
              </div>
              <span className="text-slate-400">×{item.count || 1}</span>
            </div>
          ))}
          {inventory.length === 0 && (
            <p className="text-slate-500 text-center py-8">No items in inventory</p>
          )}
        </div>
      </div>
    </div>
  )
}
