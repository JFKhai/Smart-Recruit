'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type NotificationBellProps = {
  /** Số chưa đọc — stub mặc định 0 */
  unreadCount?: number
  /** Trang danh sách đầy đủ */
  listHref?: string
  className?: string
  /** Stub: chưa gắn API — panel placeholder */
  stub?: boolean
}

/**
 * Stub Phase 0.5 — UI chuông + panel tab.
 * Sprint Candidate sẽ nối GET /api/notifications + unread-count.
 */
export default function NotificationBell({
  unreadCount = 0,
  listHref = '/candidate/notifications',
  className,
  stub = true,
}: NotificationBellProps) {
  const [tab, setTab] = useState<'all' | 'jobs' | 'cv' | 'connect'>('all')
  const tabs = [
    { id: 'all' as const, label: 'Tất cả' },
    { id: 'jobs' as const, label: 'Việc làm' },
    { id: 'cv' as const, label: 'Trạng thái CV' },
    { id: 'connect' as const, label: 'Kết nối' },
  ]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('relative rounded-full', className)}
          aria-label={
            unreadCount > 0
              ? `${unreadCount} thông báo chưa đọc`
              : 'Thông báo'
          }
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(100vw-2rem,22rem)] border-border p-0 shadow-popover"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Thông báo</h2>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-sr hover:text-primary disabled:opacity-40"
            disabled={stub}
            title={stub ? 'Sẽ nối API ở Sprint Candidate' : 'Đánh dấu đã đọc tất cả'}
            aria-label="Đánh dấu tất cả đã đọc"
          >
            <CheckCheck className="size-3.5" />
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-sr',
                tab === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="max-h-72 overflow-y-auto px-4 py-8 text-center text-sm text-muted-foreground">
          {stub
            ? 'Chưa có thông báo (stub — nối API ở Sprint Candidate).'
            : 'Không có thông báo.'}
        </div>
        <div className="border-t border-border px-4 py-2 text-center">
          <Link
            href={listHref}
            className="text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
