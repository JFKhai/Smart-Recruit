'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Menu, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MegaMenu, { type MegaMenuSection } from '@/components/MegaMenu'
import NotificationBell from '@/components/NotificationBell'
import UserMenu, {
  defaultCandidateItems,
  type UserMenuItem,
} from '@/components/UserMenu'
import { cn } from '@/lib/utils'
import type { StoredUser } from '@/lib/auth-storage'

export type PublicNavbarVariant = 'guest' | 'candidate'

export type PublicNavbarProps = {
  /** Shell mode — default guest (public pages). Employer uses EmployerTopBar instead. */
  variant?: PublicNavbarVariant
  /** Optional user summary for avatar label (Sprint Candidate wires /api/auth/me). */
  user?: Pick<StoredUser, 'email' | 'role'> | null
  /** Unread notification badge count — stub default 0. */
  notificationCount?: number
  onLogout?: () => void
  /**
   * Candidate menu items. Pass explicitly when variant="candidate".
   * Falls back to defaultCandidateItems for stub demos only.
   */
  menuItems?: UserMenuItem[]
  className?: string
}

function buildJobsSections(isGuest: boolean): MegaMenuSection[] {
  return [
    {
      title: 'Việc làm',
      items: [
        { label: 'Tìm việc làm', href: '/jobs' },
        { label: 'Việc làm đã lưu', stub: true },
        {
          label: 'Việc làm đã ứng tuyển',
          href: isGuest
            ? '/login?redirect=/candidate/applications'
            : '/candidate/applications',
        },
        {
          label: 'Việc làm phù hợp',
          href: isGuest
            ? '/login?redirect=/candidate/matches'
            : '/candidate/matches',
        },
      ],
    },
    {
      title: 'Công ty',
      items: [
        { label: 'Danh sách công ty', href: '/companies' },
        { label: 'Theo vị trí / lĩnh vực', stub: true },
      ],
    },
  ]
}

function buildCvSections(isGuest: boolean): MegaMenuSection[] {
  return [
    {
      title: 'CV của bạn',
      items: [
        {
          label: 'Quản lý CV',
          href: isGuest ? '/login?redirect=/candidate/cv' : '/candidate/cv',
        },
        {
          label: 'Tải CV lên',
          href: isGuest ? '/login?redirect=/candidate/cv' : '/candidate/cv',
        },
      ],
    },
    {
      title: 'Công cụ CV',
      items: [
        { label: 'Mẫu CV theo style', stub: true },
        { label: 'Mẫu CV theo vị trí', stub: true },
        { label: 'Hướng dẫn viết CV', stub: true },
        { label: 'Cover Letter', stub: true },
      ],
    },
  ]
}

const toolsSections: MegaMenuSection[] = [
  {
    title: 'Khám phá',
    items: [
      { label: 'Bộ câu hỏi phỏng vấn', stub: true },
      { label: 'Trắc nghiệm MBTI', stub: true },
      { label: 'Trắc nghiệm MI', stub: true },
      { label: 'Khóa học', stub: true },
    ],
  },
  {
    title: 'Công cụ',
    items: [
      { label: 'Tính lương Gross-Net', stub: true },
      { label: 'Tính thuế TNCN', stub: true },
      { label: 'Tra cứu lương', stub: true },
    ],
  },
]

type NavKey = 'jobs' | 'cv' | 'tools' | null

/**
 * Top bar for Public + Candidate shells only.
 * Employer zone uses EmployerTopBar (separate component — different structure).
 */
export default function PublicNavbar({
  variant = 'guest',
  user = null,
  notificationCount = 0,
  onLogout,
  menuItems,
  className,
}: PublicNavbarProps) {
  const [open, setOpen] = useState<NavKey>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isGuest = variant === 'guest'
  const isCandidate = variant === 'candidate'

  const jobsSections = buildJobsSections(isGuest)
  const cvSections = buildCvSections(isGuest)
  const resolvedMenuItems = menuItems ?? defaultCandidateItems

  const close = () => setOpen(null)

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80',
        className,
      )}
    >
      <div className="container-sr flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Smart<span className="text-primary">Recruit</span>
            </span>
            <span className="hidden text-[10px] text-muted-foreground sm:block">
              Việc làm thông minh với AI
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Chính">
            <NavTrigger
              label="Việc làm"
              active={open === 'jobs'}
              onClick={() => setOpen(open === 'jobs' ? null : 'jobs')}
            />
            <NavTrigger
              label="Tạo CV"
              active={open === 'cv'}
              onClick={() => setOpen(open === 'cv' ? null : 'cv')}
            />
            <NavTrigger
              label="Công cụ"
              active={open === 'tools'}
              onClick={() => setOpen(open === 'tools' ? null : 'tools')}
            />
            <span
              className="cursor-default px-3 py-2 text-sm text-placeholder"
              title="Sắp ra mắt"
            >
              Cẩm nang
            </span>
            <span
              className="cursor-default px-3 py-2 text-sm font-medium text-placeholder"
              title="Sắp ra mắt"
            >
              Pro
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isGuest ? (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/register">Đăng ký</Link>
              </Button>
              <Button
                asChild
                variant="employer"
                size="sm"
                className="hidden md:inline-flex"
              >
                <Link href="/register/employer">Đăng tuyển ngay</Link>
              </Button>
            </>
          ) : null}

          {isCandidate ? (
            <>
              <NotificationBell
                unreadCount={notificationCount}
                listHref="/candidate/notifications"
                stub
              />
              <UserMenu
                user={user}
                items={resolvedMenuItems}
                onLogout={onLogout}
              />
              <Button
                asChild
                variant="employer"
                size="sm"
                className="hidden md:inline-flex"
              >
                <Link href="/register/employer">Đăng tuyển ngay</Link>
              </Button>
            </>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Đóng menu"
            onClick={close}
          />
          <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-card">
            <div className="container-sr py-4">
              {open === 'jobs' ? (
                <MegaMenu sections={jobsSections} onNavigate={close} />
              ) : null}
              {open === 'cv' ? (
                <MegaMenu sections={cvSections} onNavigate={close} />
              ) : null}
              {open === 'tools' ? (
                <MegaMenu sections={toolsSections} onNavigate={close} />
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {mobileOpen ? (
        <div className="border-t border-border bg-card lg:hidden">
          <div className="container-sr space-y-4 py-4">
            <MegaMenu
              sections={jobsSections}
              onNavigate={() => setMobileOpen(false)}
            />
            <MegaMenu
              sections={cvSections}
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="flex flex-col gap-2 pt-2">
              {isGuest ? (
                <>
                  <Button asChild variant="outline">
                    <Link href="/login">Đăng nhập</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Đăng ký</Link>
                  </Button>
                  <Button asChild variant="employer">
                    <Link href="/register/employer">Đăng tuyển ngay</Link>
                  </Button>
                </>
              ) : null}
              {isCandidate ? (
                <Button asChild variant="employer">
                  <Link href="/register/employer">Đăng tuyển ngay</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

function NavTrigger({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-sr',
        active
          ? 'bg-primary-soft text-on-primary-soft'
          : 'text-foreground hover:bg-muted',
      )}
      aria-expanded={active}
      onClick={onClick}
    >
      {label}
      <ChevronDown
        className={cn('size-3.5 transition-sr', active && 'rotate-180')}
        aria-hidden
      />
    </button>
  )
}
