'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Briefcase,
  Home,
  Zap,
  FileText,
  CheckSquare,
  Settings,
  LogOut,
  ArrowLeftRight,
  Loader2,
  RefreshCw,
  X,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { clearAuth, setAuth, getToken } from '@/lib/auth-storage'
import { apiFetch, ApiError, apiLogout } from '@/lib/api'
import { toast } from 'sonner'

const navItems = [
  { label: 'Dashboard', href: '/candidate/dashboard', icon: Home },
  { label: 'AI Job Matches', href: '/candidate/matches', icon: Zap },
  { label: 'Applications', href: '/candidate/applications', icon: CheckSquare },
  { label: 'Profile & CV', href: '/candidate/cv', icon: FileText },
  { label: 'Notifications', href: '/candidate/notifications', icon: Bell },
  { label: 'Notification Settings', href: '/candidate/notification-settings', icon: Settings },
]

export default function CandidateSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [hasUnread, setHasUnread] = useState(false)

  // Poll unread count mỗi 30s để hiện chấm đỏ
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
    router.push('/login')
  }

  return (
    <aside className="h-screen flex flex-col bg-foreground/5 relative">
      <div className="hidden lg:flex items-center gap-2 p-6 border-b border-border">
        <span className="font-bold text-primary text-xl">Smart Recruit</span>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href)
          const isNotification = item.href === '/candidate/notifications'

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
