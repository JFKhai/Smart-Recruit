'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PublicLayout from '@/layouts/PublicLayout'
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
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { setAuth } from '@/lib/auth-storage'
import { apiFetch, type AuthResponse } from '@/lib/api'

export default function CandidateSignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    experienceLevel: '',
    headline: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleExperienceChange = (value: string) => {
    setFormData((prev) => ({ ...prev, experienceLevel: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }
    if (formData.password.length < 6) {
      toast.error('Mật khẩu cần ít nhất 6 ký tự')
      return
    }
    setLoading(true)

    try {
      const data = await apiFetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: 'candidate',
        }),
        skipAuth: true,
      })

      setAuth({
        id: data._id,
        email: data.email,
        role: data.role,
      })
      toast.success('Đăng ký thành công')
      router.push('/candidate/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng ký thất bại'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          <Link href="/register" className="inline-block mb-6">
            <Button variant="ghost" className="-ml-2 text-foreground/70">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          <Card className="p-8 border border-border">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Account</h1>
              <p className="text-foreground/70">Join Smart Recruit and find your dream job</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Sarah Chen"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="sarah@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                <Input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="San Francisco, CA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Experience Level
                </label>
                <Select
                  value={formData.experienceLevel || undefined}
                  onValueChange={handleExperienceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                    <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                    <SelectItem value="senior">Senior (5-10 years)</SelectItem>
                    <SelectItem value="expert">Expert (10+ years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Professional Headline
                </label>
                <Input
                  type="text"
                  name="headline"
                  value={formData.headline}
                  onChange={handleChange}
                  placeholder="e.g. Senior React Developer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <p className="text-center text-sm text-foreground/70 mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </PublicLayout>
  )
}
