'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { StoredUser } from '@/lib/auth-storage'

export type UserMenuItem = {
  label: string
  href?: string
  stub?: boolean
  onSelect?: () => void
  danger?: boolean
}

/**
 * Role-specific menu items for the logged-in shell.
 * Callers should pass role-specific items (do not rely on the component default).
 */
export const defaultCandidateItems: UserMenuItem[] = [
  { label: 'Dashboard', href: '/candidate/dashboard' },
  { label: 'Việc làm đã lưu', href: '/candidate/saved-jobs', stub: true },
  { label: 'Việc làm đã ứng tuyển', href: '/candidate/applications' },
  { label: 'Việc làm phù hợp với bạn', href: '/candidate/matches' },
  { label: 'CV của tôi', href: '/candidate/cv' },
  { label: 'Cover Letter của tôi', stub: true },
  { label: 'Nhà tuyển dụng muốn kết nối với bạn', stub: true },
  { label: 'Nhà tuyển dụng đã xem hồ sơ', stub: true },
  { label: 'Cài đặt', href: '/candidate/settings', stub: true },
  { label: 'Nâng cấp tài khoản', stub: true },
]

/**
 * Employer avatar dropdown items (brief Phần 3 — EmployerTopBar).
 * Callers should pass these explicitly into UserMenu from EmployerTopBar.
 */
export const defaultEmployerItems: UserMenuItem[] = [
  { label: 'Tổng quan', href: '/employer/dashboard' },
  { label: 'Hồ sơ công ty', href: '/employer/company-profile' },
  { label: 'Email & Thông báo', href: '/employer/email-settings' },
  { label: 'Nâng cấp gói', stub: true },
]

export type UserMenuProps = {
  user?: Pick<StoredUser, 'email' | 'role'> | null
  displayName?: string
  /**
   * Menu entries for the current role.
   * **Required in practice** when wiring a logged-in shell (candidate / employer).
   * Default falls back to `defaultCandidateItems` only for stub demos —
   * callers should pass role-specific items.
   */
  items?: UserMenuItem[]
  onLogout?: () => void
  className?: string
}

/**
 * Stub Phase 0.5 — avatar dropdown.
 * Guest navbar does not use this; candidate/employer shells pass items + onLogout.
 */
export default function UserMenu({
  user,
  displayName,
  // Fallback for stub demos only — callers should pass role-specific items.
  items = defaultCandidateItems,
  onLogout,
  className,
}: UserMenuProps) {
  const name = displayName || user?.email?.split('@')[0] || 'Tài khoản'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn('gap-1.5 rounded-full px-2', className)}
          aria-label="Menu tài khoản"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-on-primary-soft">
            <UserRound className="size-4" aria-hidden />
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 shadow-popover">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          {user?.email ? (
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          ) : (
            <p className="text-xs text-placeholder">Stub — nối /api/auth/me</p>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) =>
          item.stub || !item.href ? (
            <DropdownMenuItem
              key={item.label}
              disabled
              className="text-placeholder"
            >
              {item.label}
              <span className="ml-auto text-[10px] uppercase">Sắp có</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={item.label} asChild>
              <Link href={item.href}>{item.label}</Link>
            </DropdownMenuItem>
          ),
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => onLogout?.()}
        >
          <LogOut className="size-4" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
