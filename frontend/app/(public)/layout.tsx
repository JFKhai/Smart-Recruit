import React from 'react'
import PublicNavbar from '@/components/PublicNavbar'
import Footer from '@/components/Footer'

export default function PublicRouteGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar variant="guest" />
      <main className="flex-1 w-full">{children}</main>
      <Footer />
    </div>
  )
}
