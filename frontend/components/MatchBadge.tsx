import React from 'react'
import { cn } from '@/lib/utils'

export type MatchBadgeProps = {
  /** null → nhắc cập nhật CV; undefined → không render */
  score?: number | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  /** Khi score === null */
  nullHint?: string
}

const sizeClasses = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
}

export default function MatchBadge({
  score,
  size = 'md',
  showLabel = true,
  className,
  nullHint = 'Cập nhật CV để xem độ phù hợp',
}: MatchBadgeProps) {
  if (score === undefined) return null

  if (score === null) {
    return (
      <span
        className={cn(
          'inline-flex max-w-[9rem] text-left text-xs font-medium leading-snug text-muted-foreground',
          className,
        )}
      >
        {nullHint}
      </span>
    )
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)))

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border-0 bg-primary-soft font-medium text-on-primary-soft',
        sizeClasses[size],
        className,
      )}
      aria-label={`Độ phù hợp ${clamped}%`}
    >
      <span>{clamped}%</span>
      {showLabel ? <span>phù hợp</span> : null}
    </div>
  )
}
