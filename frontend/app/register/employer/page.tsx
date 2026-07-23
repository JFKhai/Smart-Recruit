'use client'

import React, { useState, useEffect } from 'react'
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
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { setAuth } from '@/lib/auth-storage'
import { apiFetch, type AuthResponse } from '@/lib/api'

export default function EmployerSignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    industry: '',
    size: '',
    country: 'Vietnam',
    province: '',
    address: '',
    about: '',
    contactName: '',
    phone: '',
    taxId: '',
  })
  
  const [captchaText, setCaptchaText] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let text = ''
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaText(text)
    setCaptchaInput('')
  }

  useEffect(() => {
    generateCaptcha()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    const requiredFields: (keyof typeof formData)[] = [
      'email', 'password', 'confirmPassword', 'companyName', 'industry', 
      'size', 'province', 'address', 'about', 'contactName', 'phone', 'taxId'
    ]
    
    requiredFields.forEach((field) => {
      if (!formData[field] || !formData[field].trim()) {
        newErrors[field] = 'This field is required.'
      }
    })

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.'
    }

    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number.'
    }

    if (!captchaInput) {
      newErrors.captcha = 'This field is required.'
    } else if (captchaInput.toLowerCase() !== captchaText.toLowerCase()) {
      newErrors.captcha = 'Incorrect verification code.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please check your input details.')
      return
    }

    setLoading(true)
    try {
      const data = await apiFetch<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: 'employer',
          companyName: formData.companyName,
          contactName: formData.contactName,
          industry: formData.industry,
          size: formData.size,
          country: formData.country,
          province: formData.province,
          address: formData.address,
          about: formData.about,
          phone: formData.phone,
          taxId: formData.taxId,
        }),
        skipAuth: true,
      })

      setAuth({
        id: data._id,
        email: data.email,
        role: data.role,
      })
      
      toast.success('Employer account registered successfully.')
      router.push('/employer/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      toast.error(msg)
      generateCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const industries = [
    { value: 'technology', label: 'Information Technology' },
    { value: 'finance', label: 'Finance / Banking' },
    { value: 'healthcare', label: 'Healthcare / Medical' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'logistics', label: 'Logistics / Transportation' },
    { value: 'education', label: 'Education / Training' },
    { value: 'marketing', label: 'Marketing / Public Relations' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'other', label: 'Other' },
  ]

  const sizes = [
    { value: 'startup', label: 'Startup (1-50 employees)' },
    { value: 'small', label: 'Small (51-200 employees)' },
    { value: 'medium', label: 'Medium (201-1000 employees)' },
    { value: 'large', label: 'Large (1000+ employees)' },
  ]

  const provinces = [
    'Ha Noi', 'Ho Chi Minh City', 'Da Nang', 'Binh Duong', 
    'Dong Nai', 'Khanh Hoa', 'Quang Ninh', 'Can Tho', 'Hai Phong', 'Other'
  ]

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-muted/30">
        <div className="w-full max-w-2xl my-8">
          <Link href="/register" className="inline-block mb-6">
            <Button variant="ghost" className="-ml-2 text-foreground/70">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to account types
            </Button>
          </Link>

          <Card className="p-8 border border-border shadow-md bg-card">
            <div className="mb-8 border-b border-border pb-6">
              <h1 className="text-3xl font-extrabold text-foreground mb-2">Employer Registration</h1>
              <p className="text-foreground/70">Create an account and connect with potential candidates using AI matching</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-l-4 border-primary pl-2">
                  Account Details
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    LOGIN EMAIL
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="hr@company.com"
                      className="bg-muted/50 border-input h-10"
                    />
                    {errors.email && <p className="text-xs text-destructive font-medium pl-1">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    PASSWORD
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="•••••••• (At least 6 characters)"
                      className="bg-muted/50 border-input h-10"
                    />
                    {errors.password && <p className="text-xs text-destructive font-medium pl-1">{errors.password}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    CONFIRM PASSWORD
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="bg-muted/50 border-input h-10"
                    />
                    {errors.confirmPassword && <p className="text-xs text-destructive font-medium pl-1">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-l-4 border-primary pl-2">
                  Company Information
                </h3>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    COMPANY NAME
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Please enter company name"
                      className="bg-muted/50 border-input h-10"
                    />
                    {errors.companyName && <p className="text-xs text-destructive font-medium pl-1">{errors.companyName}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    INDUSTRY
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Select
                      value={formData.industry || undefined}
                      onValueChange={(value) => handleSelectChange('industry', value)}
                    >
                      <SelectTrigger className="bg-muted/50 border-input h-10">
                        <SelectValue placeholder="Please select" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((ind) => (
                          <SelectItem key={ind.value} value={ind.value}>
                            {ind.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.industry && <p className="text-xs text-destructive font-medium pl-1">{errors.industry}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    COMPANY SIZE
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Select
                      value={formData.size || undefined}
                      onValueChange={(value) => handleSelectChange('size', value)}
                    >
                      <SelectTrigger className="bg-muted/50 border-input h-10">
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.size && <p className="text-xs text-destructive font-medium pl-1">{errors.size}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    COUNTRY
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Select
                      value={formData.country}
                      onValueChange={(value) => handleSelectChange('country', value)}
                    >
                      <SelectTrigger className="bg-muted/50 border-input h-10">
                        <SelectValue placeholder="Vietnam" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vietnam">Vietnam</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    PROVINCE / CITY
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Select
                      value={formData.province || undefined}
                      onValueChange={(value) => handleSelectChange('province', value)}
                    >
                      <SelectTrigger className="bg-muted/50 border-input h-10">
                        <SelectValue placeholder="Select Province/ City" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((prov) => (
                          <SelectItem key={prov} value={prov}>
                            {prov}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.province && <p className="text-xs text-destructive font-medium pl-1">{errors.province}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    COMPANY ADDRESS
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Please enter address"
                      className="bg-muted/50 border-input h-10"
                    />
                    {errors.address && <p className="text-xs text-destructive font-medium pl-1">{errors.address}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center pt-2 select-none">
                    COMPANY DESCRIPTION
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Textarea
                      name="about"
                      value={formData.about}
                      onChange={handleChange}
                      placeholder="Information about history, business, culture, etc..."
                      className="bg-muted/50 border-input min-h-[100px] resize-y"
                    />
                    {errors.about && <p className="text-xs text-destructive font-medium pl-1">{errors.about}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-l-4 border-primary pl-2">
                  Contact & Legal Information
                </h3>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    CONTACT PERSON
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Input
                      type="text"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleChange}
                      placeholder="Please enter name"
                      className="bg-muted/50 border-input h-10"
                    />
                    {errors.contactName && <p className="text-xs text-destructive font-medium pl-1">{errors.contactName}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    PHONE NUMBER
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Please enter phone number"
                      className="bg-muted/50 border-input h-10"
                    />
                    {errors.phone && <p className="text-xs text-destructive font-medium pl-1">{errors.phone}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    TAX ID / CODE
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Input
                      type="text"
                      name="taxId"
                      value={formData.taxId}
                      onChange={handleChange}
                      placeholder="Please enter tax ID"
                      className="bg-muted/50 border-input h-10"
                    />
                    {errors.taxId && <p className="text-xs text-destructive font-medium pl-1">{errors.taxId}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <div className="bg-primary/95 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-10 select-none">
                    VERIFICATION CODE
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <div className="flex items-center gap-3">
                      <Input
                        type="text"
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder="Enter captcha"
                        className="bg-muted/50 border-input h-10 flex-1 font-semibold"
                      />
                      <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-2 rounded h-10 select-none font-mono text-base font-bold italic tracking-widest line-through text-slate-700 dark:text-slate-300">
                        {captchaText}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={generateCaptcha}
                        className="h-10 w-10 shrink-0"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.captcha && <p className="text-xs text-destructive font-medium pl-1">{errors.captcha}</p>}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-border justify-end">
                <Link href="/register" passHref className="w-1/3">
                  <Button type="button" variant="outline" className="w-full h-11 text-foreground/75 font-semibold">
                    BACK
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-1/3 h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  {loading ? 'REGISTERING...' : 'REGISTER'}
                </Button>
              </div>
            </form>

            <p className="text-center text-sm text-foreground/70 mt-6 pt-4 border-t border-border/50">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Login here
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </PublicLayout>
  )
}
