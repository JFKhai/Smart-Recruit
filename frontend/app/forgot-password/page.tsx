'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { KeyRound, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Vui lòng nhập địa chỉ email của bạn')
      return
    }

    setLoading(true)
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      })
      toast.success(res.message || 'Đã gửi hướng dẫn đặt lại mật khẩu!')
      setSubmitted(true)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Không thể gửi yêu cầu đặt lại mật khẩu'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-slate-950 text-white">
      <Card className="w-full max-w-md bg-gray-900/80 border-gray-800 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/30 mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Quên Mật khẩu?</CardTitle>
          <CardDescription className="text-gray-400 text-sm">
            Nhập email tài khoản của bạn để nhận hướng dẫn đặt lại mật khẩu khẩn cấp từ Smart Recruit.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Nếu email <strong className="text-violet-300">{email}</strong> tồn tại trên hệ thống, chúng tôi đã gửi đường dẫn khôi phục mật khẩu có hiệu lực trong vòng 60 phút.
              </p>
              <p className="text-xs text-gray-500">Vui lòng kiểm tra Hòm thư đến (Inbox) hoặc hộp thư Rác (Spam).</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-300">Địa chỉ Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="pl-9 bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-lg shadow-violet-600/20"
              >
                {loading ? 'Đang gửi email khôi phục...' : 'Gửi đường dẫn Đặt lại Mật khẩu'}
              </Button>
            </form>
          )}
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
