'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import PublicLayout from '@/layouts/PublicLayout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { setAuth } from '@/lib/auth-storage'
import { apiFetch, getApiBase, type AuthResponse } from '@/lib/api'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'candidate' | 'employer'>('candidate')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Xử lý OAuth callback redirect: backend đã gắn cookie, chỉ cần redirect đúng trang
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth')
    const error = searchParams.get('error')

    if (error) {
      const errMap: Record<string, string> = {
        oauth_disabled: 'Đăng nhập mạng xã hội chưa được kích hoạt trên server này.',
        auth_failed: 'Đăng nhập thất bại. Vui lòng thử lại.',
        email_required: 'Tài khoản mạng xã hội không có email. Hãy dùng email/mật khẩu.',
      }
      const msg = errMap[error] || searchParams.get('message') || 'Đăng nhập mạng xã hội thất bại.'
      toast.error(decodeURIComponent(msg))
      router.replace('/login')
      return
    }

    // oauth=success: backend đã set cookie và redirect đây, gọi /auth/me để lấy user info
    if (oauthSuccess === 'success') {
      apiFetch<AuthResponse>('/api/auth/me', { method: 'GET' })
        .then((data) => {
          setAuth({ id: data._id, email: data.email, role: data.role })
          toast.success('Đăng nhập thành công!')
          router.push(data.role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard')
        })
        .catch(() => {
          toast.error('Xác thực thất bại. Vui lòng đăng nhập lại.')
          router.replace('/login')
        })
    }
  }, [searchParams, router])

  useEffect(() => {
    const role = searchParams.get('role')
    if (role === 'employer') {
      setActiveTab('employer')
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'candidate' | 'employer')
    setEmail('')
    setPassword('')
  }

  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    const apiBase = getApiBase()
    window.location.href = `${apiBase}/api/auth/${provider}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Backend sẽ trả về user info + gắn HTTPOnly cookie tự động
      const data = await apiFetch<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role: activeTab }),
      })

      // Chỉ lưu user metadata (KHÔNG lưu token) để hiển thị UI
      setAuth({ id: data._id, email: data.email, role: data.role })

      setLoading(false)
      if (data.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push(
          data.role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard',
        )
      }
    } catch (err) {
      setLoading(false)
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại'
      toast.error(msg)
    }
  }

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-block mb-6">
            <Button
              variant="ghost"
              className="mb-6 -ml-2 text-foreground/70"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          <Card className="p-8 border border-border">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h1>
              <p className="text-foreground/70">Sign in to your Smart Recruit account</p>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="mb-6"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="candidate">Candidate</TabsTrigger>
                <TabsTrigger value="employer">Employer</TabsTrigger>
              </TabsList>

              <TabsContent value="candidate">
                <form onSubmit={handleSubmit} className="space-y-5 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sarah@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-foreground/70">Remember me</span>
                    </label>
                    <Link href="/forgot-password" className="text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-foreground/50">Hoặc tiếp tục với</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center gap-2 hover:bg-muted/50 transition-all duration-200"
                      onClick={() => handleSocialLogin('google')}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Google
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center justify-center gap-2 hover:bg-muted/50 transition-all duration-200"
                      onClick={() => handleSocialLogin('facebook')}
                    >
                      <svg className="w-4 h-4 fill-blue-600" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="employer">
                <form onSubmit={handleSubmit} className="space-y-5 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hr@techcorp.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span className="text-foreground/70">Remember me</span>
                    </label>
                    <Link href="/forgot-password" className="text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-foreground/70 mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </PublicLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  )
}
