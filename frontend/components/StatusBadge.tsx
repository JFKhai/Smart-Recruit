import React from 'react'
import { cn } from '@/lib/utils'

/** Application + Job + legacy aliases */
export type StatusBadgeStatus =
  | 'pending'
  | 'reviewed'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'open'
  | 'closed'
  | 'archived'
  | 'applied'
  | 'reviewing'
  | 'active'
  | 'paused'

type StatusBadgeProps = {
  status: StatusBadgeStatus
  size?: 'sm' | 'md'
  className?: string
  label?: string
}

const statusConfig: Record<
  StatusBadgeStatus,
  { className: string; label: string }
> = {
  pending: {
    className: 'bg-primary-soft text-on-primary-soft',
    label: 'Đã nộp',
  },
  applied: {
    className: 'bg-primary-soft text-on-primary-soft',
    label: 'Đã nộp',
  },
  reviewed: {
    className: 'bg-muted text-muted-foreground',
    label: 'Đang xem xét',
  },
  reviewing: {
    className: 'bg-muted text-muted-foreground',
    label: 'Đang xem xét',
  },
  interview: {
    className: 'bg-hot/15 text-hot-foreground',
    label: 'Phỏng vấn',
  },
  accepted: {
    className: 'bg-card text-success',
    label: 'Nhận việc',
  },
  rejected: {
    className: 'bg-card text-destructive',
    label: 'Từ chối',
  },
  open: {
    className: 'bg-card text-success',
    label: 'Đang mở',
  },
  active: {
    className: 'bg-card text-success',
    label: 'Đang mở',
  },
  closed: {
    className: 'bg-muted text-muted-foreground',
    label: 'Đã đóng',
  },
  paused: {
    className: 'bg-hot/15 text-hot-foreground',
    label: 'Tạm dừng',
  },
  archived: {
    className: 'bg-muted text-muted-foreground',
    label: 'Lưu trữ',
  },
}

export default function StatusBadge({
  status,
  size = 'md',
  className,
  label,
}: StatusBadgeProps) {
  const config = statusConfig[status]
  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        config.className,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {label ?? config.label}
    </span>
  )
}
