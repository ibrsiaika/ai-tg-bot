import { memo } from 'react'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

/**
 * LoadingSpinner Component - Consistent loading indicator
 * Used throughout the app for loading states
 */
const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  label = '',
  centered = false,
  fullScreen = false,
  className = '',
}) {
  const sizeConfig = {
    sm: { icon: 16, text: 'text-xs' },
    md: { icon: 24, text: 'text-sm' },
    lg: { icon: 32, text: 'text-base' },
    xl: { icon: 48, text: 'text-lg' },
  }

  const sizeStyle = sizeConfig[size]

  const content = (
    <div className={clsx('flex flex-col items-center gap-2', className)}>
      <Loader2
        size={sizeStyle.icon}
        className="text-primary-500 animate-spin"
      />
      {label && (
        <span className={clsx('text-slate-400', sizeStyle.text)}>{label}</span>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50">
        {content}
      </div>
    )
  }

  if (centered) {
    return (
      <div className="flex items-center justify-center py-8">
        {content}
      </div>
    )
  }

  return content
})

export default LoadingSpinner
