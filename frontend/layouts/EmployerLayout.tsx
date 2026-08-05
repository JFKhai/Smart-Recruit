'use client'

import React, { useState } from 'react'
import EmployerSidebar from '@/components/EmployerSidebar'
import EmployerTopBar from '@/components/EmployerTopBar'
import MobileDrawer from '@/components/MobileDrawer'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmployerLayoutProps {
  children: React.ReactNode
}

/**
 * Employer shell — Phase 0.5: EmployerTopBar stub above existing sidebar console.
 * Sidebar remains until Sprint Employer consolidates navigation.
 */
export default function EmployerLayout({ children }: EmployerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <EmployerTopBar />

      <div className="lg:hidden border-b border-border bg-background">
        <div className="flex items-center justify-end px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex">
        <div className="hidden lg:block w-64 border-r border-border bg-foreground/5 fixed left-0 top-16 h-[calc(100vh-4rem)]">
          <EmployerSidebar />
        </div>

        <MobileDrawer
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          variant="employer"
        />

        <main className="flex-1 lg:ml-64 w-full overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
