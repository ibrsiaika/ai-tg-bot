import { memo, useEffect, useState } from 'react'
import clsx from 'clsx'
import Card from './Card'
import StatusIndicator from './StatusIndicator'

/**
 * SystemStatusCard Component - Displays system status with real-time updates
 * Used in Systems page and dashboard for monitoring system health
 */
const SystemStatusCard = memo(function SystemStatusCard({
  name,
  status = 'offline',
  description = '',
  critical = false,
  lastUpdate = null,
  metrics = null,
  onClick = null,
  className = '',
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [prevStatus, setPrevStatus] = useState(status)

  // Detect status changes and trigger animation
  useEffect(() => {
    if (status !== prevStatus) {
      setIsUpdating(true)
      setPrevStatus(status)
      const timer = setTimeout(() => setIsUpdating(false), 500)
      return () => clearTimeout(timer)
    }
  }, [status, prevStatus])

  const getVariant = () => {
    if (status === 'error' || status === 'offline') return 'danger'
    if (status === 'warning') return 'warning'
    if (status === 'online' || status === 'active') return 'success'
    return 'default'
  }

  return (
    <Card
      variant={getVariant()}
      className={clsx(
        'transition-all duration-300',
        isUpdating && 'scale-[1.02]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <StatusIndicator status={status} showLabel={false} size="lg" />
          <div className="min-w-0">
            <p className="text-white font-medium truncate">{name}</p>
            {critical && (
              <p className="text-xs text-yellow-400">Critical System</p>
            )}
            {description && !critical && (
              <p className="text-xs text-slate-400 truncate">{description}</p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <StatusIndicator
            status={status}
            showIcon={false}
            size="md"
          />
          {lastUpdate && (
            <p className="text-xs text-slate-500 mt-1">
              {new Date(lastUpdate).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Metrics row */}
      {metrics && (
        <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-3 gap-2">
          {Object.entries(metrics).slice(0, 3).map(([key, value]) => (
            <div key={key} className="text-center">
              <p className="text-xs text-slate-500 capitalize">{key}</p>
              <p className="text-sm text-white font-medium">{value}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
})

export default SystemStatusCard
