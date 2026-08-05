'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/NotificationBell'
import UserMenu, {
  defaultEmployerItems,
  type UserMenuItem,
} from '@/components/UserMenu'
import { cn } from '@/lib/utils'
import type { StoredUser } from '@/lib/auth-storage'

const employerQuickLinks = [
  { label: 'Tổng quan', href: '/employer/dashboard' },
  { label: 'Tin tuyển dụng', href: '/employer/jobs' },
  { label: 'Ứng viên', href: '/employer/candidates' },
  { label: 'Công ty', href: '/employer/company-profile' },
] as const

export type EmployerTopBarProps = {
  user?: Pick<StoredUser, 'email' | 'role'> | null
  notificationCount?: number
  onLogout?: () => void
  /**
   * Employer menu items — pass explicitly.
   * Falls back to defaultEmployerItems for stub demos only.
   */
  menuItems?: UserMenuItem[]
  className?: string
}

/**
 * Employer zone top bar (Phase 0.5 stub).
 * Separate from PublicNavbar — no mega-menu; dark employer tokens; work-console links.
 */
export default function EmployerTopBar({
  user = null,
  notificationCount = 0,
  onLogout,
  menuItems = defaultEmployerItems,
  className,
}: EmployerTopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-employer/20 bg-employer text-employer-foreground backdrop-blur supports-[backdrop-filter]:bg-employer/95',
        className,
      )}
    >
      <div className="container-sr flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href="/employer/dashboard"
            className="flex flex-col leading-tight"
          >
            <span className="text-lg font-bold tracking-tight text-employer-foreground">
              Smart<span className="text-primary-bright">Recruit</span>
            </span>
            <span className="hidden text-[10px] text-employer-foreground/70 sm:block">
              Nhà tuyển dụng
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Nhà tuyển dụng"
          >
            {employerQuickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-employer-foreground/90 transition-sr hover:bg-employer-foreground/10"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell
            unreadCount={notificationCount}
            listHref="/employer/notifications"
            stub
            className="text-employer-foreground hover:bg-employer-foreground/10 hover:text-employer-foreground"
          />
          <UserMenu
            user={user}
            items={menuItems}
            onLogout={onLogout}
            className="text-employer-foreground hover:bg-employer-foreground/10 hover:text-employer-foreground"
          />
          <Button
            asChild
            size="sm"
            className="hidden bg-primary text-primary-foreground hover:bg-primary-hover md:inline-flex"
          >
            <Link href="/employer/post-job">Đăng tin mới</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-employer-foreground hover:bg-employer-foreground/10 hover:text-employer-foreground lg:hidden"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-employer-foreground/15 bg-employer lg:hidden">
          <div className="container-sr space-y-4 py-4">
            <ul className="space-y-1">
              {employerQuickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="block rounded-md px-3 py-2 text-sm font-medium text-employer-foreground transition-sr hover:bg-employer-foreground/10"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Button asChild className="w-full">
              <Link href="/employer/post-job">Đăng tin mới</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  )
}
