'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Lock, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast.error('Mã xác thực không tồn tại hoặc đã bị lỗi!')
      return
    }

    if (password.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không trùng khớp!')
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      toast.success(res.message || 'Đặt lại mật khẩu thành công!')
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Đặt lại mật khẩu thất bại'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="mx-auto w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <p className="text-sm text-red-400 font-medium">Đường dẫn xác thực không hợp lệ hoặc thiếu Token.</p>
        <Link href="/forgot-password" className="text-xs text-violet-400 hover:underline block">
          Yêu cầu gửi lại email khôi phục mới
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <p className="text-sm text-emerald-300 font-medium">Đặt lại mật khẩu thành công!</p>
        <p className="text-xs text-gray-400">Đang tự động chuyển hướng đến trang Đăng nhập trong 3 giây...</p>
        <Link href="/login">
          <Button className="mt-2 bg-violet-600 hover:bg-violet-500 text-white text-xs">
            Đăng nhập Ngay
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-300">Mật khẩu mới *</label>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
            required
            minLength={6}
            className="pl-9 bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-300">Xác nhận Mật khẩu mới *</label>
        <div className="relative">
          <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
            required
            minLength={6}
            className="pl-9 bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-lg shadow-violet-600/20"
      >
        {loading ? 'Đang cập nhật mật khẩu...' : 'Xác nhận Đặt lại Mật khẩu'}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-slate-950 text-white">
      <Card className="w-full max-w-md bg-gray-900/80 border-gray-800 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/30 mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Đặt lại Mật khẩu</CardTitle>
          <CardDescription className="text-gray-400 text-sm">
            Nhập mật khẩu mới của bạn bên dưới để hoàn tất cập nhật tài khoản.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Suspense fallback={<div className="text-center text-xs text-gray-500 py-4">Đang tải...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-gray-800/80 pt-4">
          <Link
            href="/login"
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại trang Đăng nhập
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
