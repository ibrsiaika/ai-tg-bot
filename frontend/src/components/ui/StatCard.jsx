import { memo, useEffect, useState } from 'react'
import clsx from 'clsx'
import Card from './Card'

/**
 * StatCard Component - Displays statistics with real-time update animations
 * Shows a single metric with icon, value, label and optional change indicator
 */
const StatCard = memo(function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary-500',
  subtitle = '',
  trend = null, // 'up' | 'down' | null
  trendValue = '',
  variant = 'default',
  className = '',
  isLoading = false,
  lastUpdated = null,
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [prevValue, setPrevValue] = useState(value)

  // Detect value changes and trigger animation
  useEffect(() => {
    if (value !== prevValue) {
      setIsUpdating(true)
      setPrevValue(value)
      const timer = setTimeout(() => setIsUpdating(false), 500)
      return () => clearTimeout(timer)
    }
  }, [value, prevValue])

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-500'
    if (trend === 'down') return 'text-red-500'
    return 'text-slate-400'
  }

  const getTrendIcon = () => {
    if (trend === 'up') return '↑'
    if (trend === 'down') return '↓'
    return ''
  }

  if (isLoading) {
    return (
      <Card variant={variant} className={className}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1">
              <div className="h-4 bg-slate-700 rounded w-20"></div>
              <div className="h-8 bg-slate-700 rounded w-32"></div>
              <div className="h-3 bg-slate-700 rounded w-16"></div>
            </div>
            <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card 
      variant={variant} 
      className={className}
      isUpdating={isUpdating}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className={clsx(
            'text-2xl font-bold text-white mt-1 transition-all duration-300',
            isUpdating && 'scale-105'
          )}>
            {value}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {trendValue && (
              <span className={clsx('text-xs font-medium', getTrendColor())}>
                {getTrendIcon()} {trendValue}
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-slate-500">{subtitle}</span>
            )}
          </div>
        </div>
        {Icon && <Icon className={clsx(iconColor, 'w-12 h-12 opacity-50')} />}
      </div>
      {lastUpdated && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <span className="text-xs text-slate-500">
            Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      )}
    </Card>
  )
})

export default StatCard
