'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Server,
  LogOut,
  ShieldCheck,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { clearAuth } from '@/lib/auth-storage'
import { apiLogout } from '@/lib/api'

const navItems = [
  { label: 'Tổng quan', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Tài khoản', href: '/admin/users', icon: Users },
  { label: 'Tin tuyển dụng', href: '/admin/jobs', icon: Briefcase },
  { label: 'Đánh giá', href: '/admin/reviews', icon: Star },
  { label: 'Hệ thống', href: '/admin/system', icon: Server },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const signOut = async () => {
    await apiLogout() // Gọi backend để xóa cookie + clearAuth localStorage
    router.push('/login')
  }

  return (
    <aside className="h-screen flex flex-col bg-gray-950 border-r border-gray-800">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div className="hidden lg:block">
          <p className="text-white font-bold text-sm leading-none">Smart Recruit</p>
          <p className="text-violet-400 text-xs mt-0.5 font-medium">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-150',
                  isActive && 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/25 hover:text-violet-200 border border-violet-500/20'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-800 p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="hidden lg:inline">Đăng xuất</span>
        </Button>
        <p className="text-xs text-gray-600 px-3 mt-2 hidden lg:block">Smart Recruit v1.0</p>
      </div>
    </aside>
  )
}
