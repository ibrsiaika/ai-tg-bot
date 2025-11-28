import { memo } from 'react'
import clsx from 'clsx'

/**
 * Enhanced Card Component with real-time update support
 * Provides consistent card styling with animation support for live updates
 */
const Card = memo(function Card({
  children,
  className = '',
  variant = 'default',
  isUpdating = false,
  animate = false,
  onClick = null,
  ...props
}) {
  const variants = {
    default: 'bg-slate-800 border-slate-700',
    primary: 'bg-slate-800 border-primary-500/50',
    success: 'bg-slate-800 border-green-500/50',
    warning: 'bg-slate-800 border-yellow-500/50',
    danger: 'bg-slate-800 border-red-500/50',
    ghost: 'bg-slate-900/50 border-slate-800',
  }

  return (
    <div
      className={clsx(
        'rounded-lg shadow-lg p-6 border transition-all duration-300',
        variants[variant],
        isUpdating && 'ring-2 ring-primary-500/30 animate-pulse',
        animate && 'animate-fadeIn',
        onClick && 'cursor-pointer hover:border-primary-400 hover:shadow-xl',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
})

export default Card
