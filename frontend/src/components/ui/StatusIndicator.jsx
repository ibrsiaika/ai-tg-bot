import { memo } from 'react'
import clsx from 'clsx'
import { Activity, CheckCircle, XCircle, AlertCircle, Clock, Loader2 } from 'lucide-react'

/**
 * StatusIndicator Component - Real-time status display with animations
 * Used for system status, connection status, and service indicators
 */
const StatusIndicator = memo(function StatusIndicator({
  status = 'offline',
  label = '',
  size = 'md',
  showIcon = true,
  showLabel = true,
  pulse = true,
  className = '',
}) {
  const statusConfig = {
    online: {
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      icon: CheckCircle,
      label: 'Online',
    },
    active: {
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      icon: CheckCircle,
      label: 'Active',
    },
    offline: {
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      icon: XCircle,
      label: 'Offline',
    },
    error: {
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      icon: XCircle,
      label: 'Error',
    },
    idle: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      icon: Clock,
      label: 'Idle',
    },
    warning: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      icon: AlertCircle,
      label: 'Warning',
    },
    loading: {
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      icon: Loader2,
      label: 'Loading',
    },
    unknown: {
      color: 'text-slate-400',
      bgColor: 'bg-slate-400',
      icon: Activity,
      label: 'Unknown',
    },
  }

  const sizeConfig = {
    sm: { dot: 'w-2 h-2', icon: 14, text: 'text-xs' },
    md: { dot: 'w-3 h-3', icon: 16, text: 'text-sm' },
    lg: { dot: 'w-4 h-4', icon: 20, text: 'text-base' },
  }

  const config = statusConfig[status] || statusConfig.unknown
  const sizeStyle = sizeConfig[size]
  const Icon = config.icon
  const displayLabel = label || config.label

  const shouldPulse = pulse && (status === 'online' || status === 'active' || status === 'loading')

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      {showIcon ? (
        <Icon 
          className={clsx(
            config.color,
            status === 'loading' && 'animate-spin'
          )} 
          size={sizeStyle.icon} 
        />
      ) : (
        <span
          className={clsx(
            'rounded-full',
            config.bgColor,
            sizeStyle.dot,
            shouldPulse && 'animate-pulse'
          )}
        />
      )}
      {showLabel && (
        <span className={clsx(config.color, sizeStyle.text, 'font-medium capitalize')}>
          {displayLabel}
        </span>
      )}
    </div>
  )
})

export default StatusIndicator
