import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react'

export type CvProcessingStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'completed'
  | 'failed'

type AIBadgeProps = {
  /** Trạng thái AI parse CV — ưu tiên hơn text generic */
  status?: CvProcessingStatus
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

const sizePad = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1',
  lg: 'px-3 py-1.5 text-sm gap-1.5',
}

const iconSize = {
  sm: 'size-3',
  md: 'size-3.5',
  lg: 'size-4',
}

const statusUi: Record<
  CvProcessingStatus,
  { label: string; className: string; Icon: typeof Sparkles }
> = {
  queued: {
    label: 'Chờ AI',
    className: 'bg-primary-soft text-on-primary-soft',
    Icon: Clock,
  },
  processing: {
    label: 'Đang xử lý',
    className: 'bg-primary-soft text-on-primary-soft',
    Icon: Loader2,
  },
  ready: {
    label: 'Sẵn sàng',
    className: 'bg-card text-success',
    Icon: CheckCircle2,
  },
  completed: {
    label: 'Sẵn sàng',
    className: 'bg-card text-success',
    Icon: CheckCircle2,
  },
  failed: {
    label: 'Thất bại',
    className: 'bg-card text-destructive',
    Icon: XCircle,
  },
}

export default function AIBadge({
  status,
  size = 'md',
  text = 'AI',
  className,
}: AIBadgeProps) {
  if (status) {
    const ui = statusUi[status]
    const Icon = ui.Icon
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          sizePad[size],
          ui.className,
          className,
        )}
      >
        <Icon
          className={cn(
            iconSize[size],
            status === 'processing' && 'animate-spin',
          )}
          aria-hidden
        />
        {ui.label}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border-0 bg-primary-soft font-medium text-on-primary-soft',
        sizePad[size],
        className,
      )}
    >
      <Sparkles className={iconSize[size]} aria-hidden />
      <span>{text}</span>
    </span>
  )
}
