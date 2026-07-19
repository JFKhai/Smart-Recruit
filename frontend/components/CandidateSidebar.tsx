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
  const [switching, setSwitching] = useState(false)
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

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [modalData, setModalData] = useState({
    companyName: '',
    industry: '',
    size: '',
    country: 'Việt Nam',
    province: '',
    address: '',
    about: '',
    contactName: '',
    phone: '',
    taxId: '',
  })

  const [captchaText, setCaptchaText] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({})

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let text = ''
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCaptchaText(text)
    setCaptchaInput('')
  }

  const signOut = async () => {
    await apiLogout() // Gọi backend để xóa cookie + clearAuth localStorage
    router.push('/login')
  }

  const handleSwitchRole = async () => {
    setSwitching(true)
    try {
      const res = await apiFetch<{ data: { _id: string; email: string; role: string } }>('/api/users/me/switch-role', {
        method: 'PATCH',
      })
      const user = res.data
      setAuth({ id: user._id, email: user.email, role: user.role as 'candidate' | 'employer' | 'admin' })
      toast.success('Đã chuyển sang giao diện Nhà tuyển dụng!')
      router.push('/employer/dashboard')
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        const body = e.body as { code?: string; message?: string; profile?: any }
        if (body && body.code === 'PROFILE_REQUIRED') {
          const profile = body.profile || {}
          setModalData({
            companyName: profile.companyName || '',
            industry: profile.industry || '',
            size: profile.size || '',
            country: profile.country || 'Việt Nam',
            province: profile.province || '',
            address: profile.address || '',
            about: profile.about || '',
            contactName: profile.contactName || '',
            phone: profile.phone || '',
            taxId: profile.taxId || '',
          })
          generateCaptcha()
          setModalErrors({})
          setShowProfileModal(true)
          return
        }
      }
      toast.error(e instanceof Error ? e.message : 'Đổi vai trò thất bại')
    } finally {
      setSwitching(false)
    }
  }

  const handleModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setModalData((prev) => ({ ...prev, [name]: value }))
    if (modalErrors[name]) {
      setModalErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleModalSelectChange = (name: string, value: string) => {
    setModalData((prev) => ({ ...prev, [name]: value }))
    if (modalErrors[name]) {
      setModalErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validateModalForm = () => {
    const newErrors: Record<string, string> = {}
    const requiredFields = [
      'companyName', 'industry', 'size', 'province',
      'address', 'about', 'contactName', 'phone', 'taxId'
    ]

    requiredFields.forEach((field) => {
      const val = modalData[field as keyof typeof modalData]
      if (!val || !val.trim()) {
        newErrors[field] = 'Không được để trống.'
      }
    })

    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/
    if (modalData.phone && !phoneRegex.test(modalData.phone)) {
      newErrors.phone = 'Vui lòng nhập đúng số di động.'
    }

    if (!captchaInput) {
      newErrors.captcha = 'Không được để trống.'
    } else if (captchaInput.toLowerCase() !== captchaText.toLowerCase()) {
      newErrors.captcha = 'Mã xác nhận không chính xác.'
    }

    setModalErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateModalForm()) {
      toast.error('Vui lòng kiểm tra lại thông tin nhập liệu')
      return
    }

    setSwitching(true)
    try {
      const res = await apiFetch<{ data: { _id: string; email: string; role: string } }>('/api/users/me/switch-role', {
        method: 'PATCH',
        body: JSON.stringify(modalData),
      })
      const user = res.data
      setAuth({ id: user._id, email: user.email, role: user.role as 'candidate' | 'employer' | 'admin' })
      toast.success('Cập nhật hồ sơ thành công! Đã chuyển sang giao diện Nhà tuyển dụng!')
      setShowProfileModal(false)
      router.push('/employer/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đổi vai trò thất bại'
      toast.error(msg)
      generateCaptcha()
    } finally {
      setSwitching(false)
    }
  }

  const industries = [
    { value: 'technology', label: 'Công nghệ thông tin' },
    { value: 'finance', label: 'Tài chính / Ngân hàng' },
    { value: 'healthcare', label: 'Y tế / Sức khỏe' },
    { value: 'consulting', label: 'Tư vấn' },
    { value: 'logistics', label: 'Vận tải / Logistics' },
    { value: 'education', label: 'Giáo dục / Đào tạo' },
    { value: 'marketing', label: 'Marketing / Truyền thông' },
    { value: 'manufacturing', label: 'Sản xuất' },
    { value: 'other', label: 'Lĩnh vực khác' },
  ]

  const sizes = [
    { value: 'startup', label: 'Startup (1-50 nhân viên)' },
    { value: 'small', label: 'Quy mô nhỏ (51-200 nhân viên)' },
    { value: 'medium', label: 'Quy mô vừa (201-1000 nhân viên)' },
    { value: 'large', label: 'Quy mô lớn (1000+ nhân viên)' },
  ]

  const provinces = [
    'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Bình Dương',
    'Đồng Nai', 'Khánh Hòa', 'Quảng Ninh', 'Cần Thơ', 'Hải Phòng', 'Khác'
  ]

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
          className="w-full justify-start gap-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={handleSwitchRole}
          disabled={switching}
        >
          {switching ? <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" /> : <ArrowLeftRight className="h-5 w-5 flex-shrink-0" />}
          <span className="hidden lg:inline">Chuyển sang Tuyển dụng</span>
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

      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 border border-border shadow-2xl relative bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 rounded-full"
              onClick={() => setShowProfileModal(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-6 border-b border-border pb-4">
              <h2 className="text-2xl font-bold text-foreground">Bổ sung Thông tin Nhà tuyển dụng</h2>
              <p className="text-sm text-foreground/70 mt-1">
                Vui lòng điền đầy đủ các thông tin bắt buộc dưới đây để tiến hành kích hoạt tài khoản Tuyển dụng.
              </p>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-9 select-none">
                  TÊN CÔNG TY
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Input
                    type="text"
                    name="companyName"
                    value={modalData.companyName}
                    onChange={handleModalChange}
                    placeholder="Vui lòng nhập thông tin"
                    className="bg-muted/50 border-input h-9"
                  />
                  {modalErrors.companyName && (
                    <p className="text-[11px] text-destructive font-medium pl-1">{modalErrors.companyName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-9 select-none">
                  LOẠI HÌNH HOẠT ĐỘNG
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Select
                    value={modalData.industry || undefined}
                    onValueChange={(val) => handleModalSelectChange('industry', val)}
                  >
                    <SelectTrigger className="bg-muted/50 border-input h-9">
                      <SelectValue placeholder="Vui lòng chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>
                          {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {modalErrors.industry && (
                    <p className="text-[11px] text-destructive font-medium pl-1">{modalErrors.industry}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-9 select-none">
                  CHỌN SỐ NHÂN VIÊN
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Select
                    value={modalData.size || undefined}
                    onValueChange={(val) => handleModalSelectChange('size', val)}
                  >
                    <SelectTrigger className="bg-muted/50 border-input h-9">
                      <SelectValue placeholder="Chọn số nhân viên" />
                    </SelectTrigger>
                    <SelectContent>
                      {sizes.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {modalErrors.size && (
                    <p className="text-[11px] text-destructive font-medium pl-1">{modalErrors.size}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-9 select-none">
                  QUỐC GIA
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Select
                    value={modalData.country}
                    onValueChange={(val) => handleModalSelectChange('country', val)}
                  >
                    <SelectTrigger className="bg-muted/50 border-input h-9">
                      <SelectValue placeholder="Việt Nam" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Việt Nam">Việt Nam</SelectItem>
                      <SelectItem value="Khác">Nước ngoài</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-9 select-none">
                  TỈNH / TP
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Select
                    value={modalData.province || undefined}
                    onValueChange={(val) => handleModalSelectChange('province', val)}
                  >
                    <SelectTrigger className="bg-muted/50 border-input h-9">
                      <SelectValue placeholder="Chọn Tỉnh/ TP" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((prov) => (
                        <SelectItem key={prov} value={prov}>
                          {prov}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {modalErrors.province && (
                    <p className="text-[11px] text-destructive font-medium pl-1">{modalErrors.province}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-9 select-none">
                  ĐỊA CHỈ CÔNG TY
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Input
                    type="text"
                    name="address"
                    value={modalData.address}
                    onChange={handleModalChange}
                    placeholder="Vui lòng nhập thông tin"
                    className="bg-muted/50 border-input h-9"
                  />
                  {modalErrors.address && (
                    <p className="text-[11px] text-destructive font-medium pl-1">{modalErrors.address}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center pt-1.5 select-none">
                  SƠ LƯỢC VỀ CÔNG TY
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Textarea
                    name="about"
                    value={modalData.about}
                    onChange={handleModalChange}
                    placeholder="Giới thiệu sơ lược về công ty của bạn..."
                    className="bg-muted/50 border-input min-h-[60px] resize-y text-sm"
                  />
                  {modalErrors.about && (
                    <p className="text-[11px] text-destructive font-medium pl-1">{modalErrors.about}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-9 select-none">
                  TÊN NGƯỜI LIÊN HỆ
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Input
                    type="text"
                    name="contactName"
                    value={modalData.contactName}
                    onChange={handleModalChange}
                    placeholder="Vui lòng nhập thông tin"
                    className="bg-muted/50 border-input h-9"
                  />
                  {modalErrors.contactName && (
                    <p className="text-[11px] text-destructive font-medium pl-1">{modalErrors.contactName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-9 select-none">
                  ĐIỆN THOẠI
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Input
                    type="text"
                    name="phone"
                    value={modalData.phone}
                    onChange={handleModalChange}
                    placeholder="Vui lòng nhập thông tin"
                    className="bg-muted/50 border-input h-9"
                  />
                  {modalErrors.phone && (
                    <p className="text-[11px] text-destructive font-medium pl-1">{modalErrors.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-9 select-none">
                  MÃ SỐ THUẾ
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Input
                    type="text"
                    name="taxId"
                    value={modalData.taxId}
                    onChange={handleModalChange}
                    placeholder="Vui lòng nhập mã số thuế"
                    className="bg-muted/50 border-input h-9"
                  />
                  {modalErrors.taxId && (
                    <p className="text-[11px] text-destructive font-medium pl-1">{modalErrors.taxId}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                <div className="bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold rounded flex items-center h-9 select-none">
                  MÃ XÁC NHẬN
                </div>
                <div className="md:col-span-2 space-y-1">
                  <div className="flex items-center gap-3">
                    <Input
                      type="text"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      placeholder="Nhập mã xác nhận"
                      className="bg-muted/50 border-input h-9 flex-1 font-semibold text-sm"
                    />
                    <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1 rounded h-9 select-none font-mono text-sm font-bold italic tracking-widest line-through text-slate-700 dark:text-slate-300">
                      {captchaText}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateCaptcha}
                      className="h-9 w-9 shrink-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  {modalErrors.captcha && (
                    <p className="text-[11px] text-destructive font-medium pl-1">{modalErrors.captcha}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-border justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProfileModal(false)}
                  className="w-28 h-10 font-semibold"
                >
                  QUAY LẠI
                </Button>
                <Button
                  type="submit"
                  disabled={switching}
                  className="w-28 h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                >
                  {switching ? 'ĐANG LƯU...' : 'ĐĂNG KÝ'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </aside>
  )
}
