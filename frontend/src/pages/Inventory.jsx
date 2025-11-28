import { memo } from 'react'
import { Package, Grid, RefreshCw } from 'lucide-react'
import { Card, StatCard, LiveBadge } from '../components/ui'
import { useSocket } from '../hooks/useSocket'

const InventorySlot = memo(function InventorySlot({ item, index }) {
  return (
    <div
      className={`aspect-square border rounded-lg flex items-center justify-center transition-all duration-200 ${
        item
          ? 'bg-slate-700 border-slate-600 hover:border-primary-500 hover:scale-105'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      {item && (
        <div className="text-center p-2">
          <Package size={20} className="text-primary-500 mx-auto" />
          <p className="text-xs text-slate-300 mt-1 truncate">{item.name || `Item ${index}`}</p>
          {item.count && (
            <p className="text-xs text-slate-500">×{item.count}</p>
          )}
        </div>
      )}
    </div>
  )
})

const ItemRow = memo(function ItemRow({ item, index }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors animate-fadeIn">
      <div className="flex items-center gap-3">
        <Package size={20} className="text-primary-500" />
        <span className="text-slate-300">{item.name || `Item ${index}`}</span>
      </div>
      <span className="text-slate-400">×{item.count || 1}</span>
    </div>
  )
})

export default function Inventory({ data }) {
  const { connected, requestRefresh, lastUpdate } = useSocket()
  const inventory = data.inventory || []
  const totalSlots = 36
  const usedSlots = inventory.length
  const freeSlots = totalSlots - usedSlots
  const fillPercentage = Math.round((usedSlots / totalSlots) * 100)

  const handleRefresh = () => {
    requestRefresh('inventory')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Inventory</h2>
          <p className="text-slate-400 mt-1">Items and equipment management</p>
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

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Slots"
          value={totalSlots}
          icon={Grid}
          iconColor="text-slate-400"
          subtitle="Available capacity"
        />
        <StatCard
          title="Used Slots"
          value={usedSlots}
          icon={Package}
          iconColor="text-primary-500"
          subtitle={`${fillPercentage}% full`}
          lastUpdated={data.timestamps?.inventory}
        />
        <StatCard
          title="Free Slots"
          value={freeSlots}
          icon={Grid}
          iconColor="text-green-500"
          subtitle="Remaining space"
          variant={freeSlots < 5 ? 'warning' : 'default'}
        />
        <StatCard
          title="Total Items"
          value={inventory.reduce((acc, item) => acc + (item.count || 1), 0)}
          icon={Package}
          iconColor="text-blue-500"
          subtitle="Stack count"
        />
      </div>

      {/* Inventory Grid */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Grid size={20} className="text-white" />
            <h3 className="text-xl font-bold text-white">Inventory Grid</h3>
          </div>
          <span className="text-xs text-slate-500">
            {usedSlots}/{totalSlots} slots used
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-slate-700 rounded-full mb-4 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              fillPercentage > 90 ? 'bg-red-500' : fillPercentage > 70 ? 'bg-yellow-500' : 'bg-primary-500'
            }`}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
        
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
          {Array.from({ length: totalSlots }).map((_, i) => (
            <InventorySlot key={i} item={inventory[i]} index={i} />
          ))}
        </div>
      </Card>

      {/* Item List */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Item List</h3>
          <span className="text-xs text-slate-500">
            {inventory.length} unique items
          </span>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {inventory.map((item, i) => (
            <ItemRow key={`${item.name}-${i}`} item={item} index={i} />
          ))}
          {inventory.length === 0 && (
            <div className="text-center py-12">
              <Package size={48} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500">No items in inventory</p>
              <p className="text-xs text-slate-600 mt-1">Items will appear here when collected</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
