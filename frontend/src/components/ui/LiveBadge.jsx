import { memo } from 'react'
import clsx from 'clsx'
import { Radio } from 'lucide-react'

/**
 * LiveBadge Component - Indicates real-time data streaming
 * Shows a pulsing indicator to signal live data updates
 */
const LiveBadge = memo(function LiveBadge({
  isLive = true,
  label = 'LIVE',
  size = 'md',
  className = '',
}) {
  const sizeConfig = {
    sm: { padding: 'px-1.5 py-0.5', text: 'text-xs', icon: 10 },
    md: { padding: 'px-2 py-1', text: 'text-xs', icon: 12 },
    lg: { padding: 'px-3 py-1.5', text: 'text-sm', icon: 14 },
  }

  const sizeStyle = sizeConfig[size]

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide',
        sizeStyle.padding,
        sizeStyle.text,
        isLive
          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
          : 'bg-slate-700/50 text-slate-400 border border-slate-600',
        className
      )}
    >
      <Radio
        size={sizeStyle.icon}
        className={clsx(isLive && 'animate-pulse')}
      />
      <span>{label}</span>
    </div>
  )
})

export default LiveBadge
