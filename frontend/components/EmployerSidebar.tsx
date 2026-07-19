'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Briefcase,
  Home,
  Plus,
  Users,
  Building,
  Settings,
  LogOut,
  Share2,
  ArrowLeftRight,
  Loader2,
  Bell,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { clearAuth, setAuth } from '@/lib/auth-storage'
import { apiFetch, apiLogout } from '@/lib/api'
import { toast } from 'sonner'

const navItems = [
  { label: 'Dashboard', href: '/employer/dashboard', icon: Home },
  { label: 'Post a Job', href: '/employer/post-job', icon: Plus },
  { label: 'Candidates', href: '/employer/candidates', icon: Users },
  { label: 'Đánh giá công ty', href: '/employer/reviews', icon: Star },
  { label: 'Company Profile', href: '/employer/company-profile', icon: Building },
  { label: 'Thông báo', href: '/employer/notifications', icon: Bell },
  { label: 'Social Posts', href: '/fb-generator', icon: Share2 },
  { label: 'Email Settings', href: '/employer/email-settings', icon: Settings },
]

export default function EmployerSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [switching, setSwitching] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  // Poll unread count mỗi 30s
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const data = await apiFetch<{ count: number }>('/api/notifications/unread-count')
        setHasUnread((data.count || 0) > 0)
      } catch { /* silent */ }
    }
    checkUnread()
    const interval = setInterval(checkUnread, 30000)
    return () => clearInterval(interval)
  }, [])

  const signOut = async () => {
    await apiLogout() // Gọi backend để xóa cookie + clearAuth localStorage
    router.push('/login?role=employer')
  }

  const handleSwitchRole = async () => {
    setSwitching(true)
    try {
      const res = await apiFetch<{ data: { _id: string; email: string; role: string } }>('/api/users/me/switch-role', {
        method: 'PATCH',
      })
      const user = res.data
      setAuth({ id: user._id, email: user.email, role: user.role as 'candidate' | 'employer' | 'admin' })
      toast.success('Đã chuyển sang giao diện Ứng viên!')
      router.push('/candidate/dashboard')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Đổi vai trò thất bại')
    } finally {
      setSwitching(false)
    }
  }

  return (
    <aside className="h-screen flex flex-col bg-foreground/5">
      <div className="hidden lg:flex items-center gap-2 p-6 border-b border-border">
        <span className="font-bold text-primary text-xl">Smart Recruit</span>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href)
          const isNotification = item.href === '/employer/notifications'

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 text-foreground/70 hover:text-foreground relative',
                  isActive && 'bg-primary/10 text-primary hover:bg-primary/15 font-medium'
                )}
              >
                <span className="relative flex-shrink-0">
                  <Icon className="h-5 w-5" />
                  {isNotification && hasUnread && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </span>
                <span className="hidden lg:inline">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-2">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleSwitchRole}
          disabled={switching}
        >
          {switching ? <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" /> : <ArrowLeftRight className="h-5 w-5 flex-shrink-0" />}
          <span className="hidden lg:inline">Chuyển sang Ứng viên</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 text-foreground/70 hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="hidden lg:inline">Đăng xuất</span>
        </Button>
        <p className="text-xs text-foreground/50 px-3 hidden lg:block">
          Smart Recruit v1.0
        </p>
      </div>
    </aside>
  )
}
