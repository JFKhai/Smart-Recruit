'use client'

import React, { useEffect, useRef, useState } from 'react'

import CandidateLayout from '@/layouts/CandidateLayout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import SkillTag from '@/components/SkillTag'
import { FileUp, Palette, Languages, Type, Plus, Download, Save, Loader2, Star, Trash2, FileText, CheckCircle, Eye } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiFetch, getApiBase } from '@/lib/api'
import { toast } from 'sonner'

type CvData = {
  _id?: string
  name: string
  headline: string
  email: string
  phone: string
  location: string
  address: string
  dateOfBirth: string
  website: string
  objective: string
  experience: string
  education: string
  skills: string[]
  certifications: string
  isPrimary?: boolean
  hasEmbedding?: boolean
  fileUrl?: string
  createdAt?: string
}

const emptyData: CvData = {
  name: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  address: '',
  dateOfBirth: '',
  website: '',
  objective: '',
  experience: '',
  education: '',
  skills: [],
  certifications: '',
  isPrimary: false,
  hasEmbedding: false,
}

const themeOptions = [
  { key: 'slate', label: 'Slate', color: '#334155' },
  { key: 'blue', label: 'Blue', color: '#1d4ed8' },
  { key: 'emerald', label: 'Emerald', color: '#047857' },
  { key: 'purple', label: 'Purple', color: '#6d28d9' },
]

function mapCvFromApi(cv: any, userEmail: string): CvData {
  const expText = Array.isArray(cv.experience)
    ? cv.experience
        .map(
          (e: any) =>
            `${e.position || ''} tại ${e.company || ''} (${e.startDate ? new Date(e.startDate).getFullYear() : ''} - ${e.endDate ? new Date(e.endDate).getFullYear() : 'nay'})\n${e.description || ''}`
        )
        .join('\n\n')
    : ''

  const eduText = Array.isArray(cv.education)
    ? cv.education
        .map((e: any) => `${e.major || ''} — ${e.school || ''}${e.gpa ? ` (GPA: ${e.gpa})` : ''}`)
        .join('\n')
    : ''

  return {
    _id: cv._id,
    name: cv.fullName || '',
    headline: cv.headline || '',
    email: cv.email || userEmail,
    phone: cv.phone || '',
    location: cv.location || '',
    address: cv.address || '',
    dateOfBirth: cv.dateOfBirth || '',
    website: cv.website || '',
    objective: cv.summary || '',
    experience: expText,
    education: eduText,
    skills: cv.skills || [],
    certifications: cv.certifications || '',
    isPrimary: cv.isPrimary || false,
    hasEmbedding: cv.embedding && cv.embedding.length > 0,
    fileUrl: cv.fileUrl || '',
    createdAt: cv.createdAt || '',
  }
}

function mapCvToPayload(form: CvData) {
  const experienceParsed = form.experience
    ? [{ company: 'Xem chi tiết', position: 'Xem chi tiết', description: form.experience }]
    : []

  const educationParsed = form.education
    ? [{ school: form.education, major: '', gpa: '' }]
    : []

  return {
    fullName: form.name,
    headline: form.headline,
    email: form.email,
    phone: form.phone,
    location: form.location,
    address: form.address,
    dateOfBirth: form.dateOfBirth,
    website: form.website,
    summary: form.objective,
    certifications: form.certifications,
    skills: form.skills,
    experience: experienceParsed,
    education: educationParsed,
    isLookingForJob: true,
  }
}
export default function CVPage() {
  const [cvList, setCvList] = useState<CvData[]>([])
  const [formData, setFormData] = useState<CvData>(emptyData)
  const [cvId, setCvId] = useState<string | null>(null)
  const [newSkill, setNewSkill] = useState('')
  const [importedCvFileName, setImportedCvFileName] = useState<string | null>(null)
  const [language, setLanguage] = useState<'vi' | 'en'>('vi')
  const [theme, setTheme] = useState<(typeof themeOptions)[number]['key']>('blue')
  const [fontScale, setFontScale] = useState<'compact' | 'default' | 'comfortable'>('default')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const cvPreviewRef = useRef<HTMLDivElement>(null)
  const [userEmail, setUserEmail] = useState('')

  const handleLanguageChange = (val: 'vi' | 'en') => {
    setLanguage(val)
    localStorage.setItem('cv_language', val)
  }

  // Hidden portal + print CSS so only the CV is printed
  const handleExportPDF = () => {
    if (!cvPreviewRef.current) return
    setExporting(true)

    const printStyle = document.createElement('style')
    printStyle.id = 'cv-print-style'
    printStyle.innerHTML = `
      @media print {
        body > *:not(#cv-print-portal) { display: none !important; }
        #cv-print-portal { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 99999; }
        #cv-print-area { display: block !important; background: white; }
        @page { size: A4 portrait; margin: 0; }
      }
    `
    document.head.appendChild(printStyle)

    const portal = document.createElement('div')
    portal.id = 'cv-print-portal'
    portal.style.display = 'none'
    const clone = cvPreviewRef.current.cloneNode(true) as HTMLElement
    clone.id = 'cv-print-area'
    clone.style.width = '210mm'
    clone.style.minHeight = '297mm'
    clone.style.padding = '0'
    clone.style.background = 'white'
    portal.appendChild(clone)
    document.body.appendChild(portal)

    setTimeout(() => {
      window.print()
      setTimeout(() => {
        printStyle.remove()
        portal.remove()
        setExporting(false)
        toast.success('Mở hộp thoại in — chọn "Save as PDF" để xuất file PDF!')
      }, 500)
    }, 300)
  }

  useEffect(() => {
    // Restore language preference safely on client side
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('cv_language') as 'vi' | 'en'
      if (savedLang) {
        setLanguage(savedLang)
      }
    }

    const loadCv = async () => {
      try {
        const userRes = await apiFetch<{ data: { user: any; cv: any } }>('/api/users/me/profile')
        const { user } = userRes.data
        const email = user?.email || ''
        setUserEmail(email)

        const cvRes = await apiFetch<{ data: any[] }>('/api/cv')
        const all = cvRes.data || []
        const mapped = all.map((cv: any) => mapCvFromApi(cv, email))
        setCvList(mapped)

        const primary = mapped.find((c) => c.isPrimary) || mapped[0]
        if (primary) {
          setCvId(primary._id || null)
          setFormData(primary)
          setImportedCvFileName(primary.fileUrl ? primary.fileUrl.split(/[\\/]/).pop() || null : null)
        } else {
          setFormData((prev) => ({ ...prev, email }))
        }
      } catch {
        toast.error('Không tải được hồ sơ CV')
      } finally {
        setLoading(false)
      }
    }
    loadCv()
  }, [])

  const handleAddSkill = () => {
    const normalizedSkill = newSkill.trim()
    if (normalizedSkill && !formData.skills.includes(normalizedSkill)) {
      setFormData({ ...formData, skills: [...formData.skills, normalizedSkill] })
      setNewSkill('')
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) })
  }

  const handleSetPrimary = async (id: string) => {
    setSettingPrimary(id)
    try {
      await apiFetch(`/api/cv/${id}/set-primary`, { method: 'PATCH' })
      toast.success('Đã đặt làm CV chính!')
      setCvList((prev) => prev.map((c) => ({ ...c, isPrimary: c._id === id })))
      setFormData((prev) => ({ ...prev, isPrimary: prev._id === id }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể đặt CV chính')
    } finally {
      setSettingPrimary(null)
    }
  }

  const handleDeleteCV = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa CV này không?')) return
    setDeletingId(id)
    try {
      await apiFetch(`/api/cv/${id}`, { method: 'DELETE' })
      toast.success('Đã xóa CV!')
      const newList = cvList.filter((c) => c._id !== id)
      setCvList(newList)
      if (cvId === id) {
        const next = newList.find((c) => c.isPrimary) || newList[0]
        if (next) {
          setCvId(next._id || null)
          setFormData(next)
        } else {
          setCvId(null)
          setFormData({ ...emptyData, email: userEmail })
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không thể xóa CV')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSelectCV = (cv: CvData) => {
    setCvId(cv._id || null)
    setFormData(cv)
    setImportedCvFileName(cv.fileUrl ? cv.fileUrl.split(/[\\/]/).pop() || null : null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = mapCvToPayload(formData)
      if (cvId) {
        const res = await apiFetch<{ data: any }>(`/api/cv/${cvId}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('Đã cập nhật hồ sơ CV!')
        if (res.data) {
          const updated = mapCvFromApi(res.data, userEmail)
          setCvList((prev) => prev.map((c) => c._id === cvId ? { ...updated, isPrimary: c.isPrimary } : c))
        }
      } else {
        const res = await apiFetch<{ data: any }>('/api/cv', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        const newId = res.data?._id || null
        setCvId(newId)
        toast.success('Đã lưu hồ sơ CV!')
        if (res.data) {
          const newCv = mapCvFromApi(res.data, userEmail)
          setCvList((prev) => [newCv, ...prev])
          setFormData(newCv)
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleCvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportedCvFileName(file.name)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('cv', file)
      form.append('fullName', formData.name || 'Ứng viên')
      // Dùng fetch thủ công vì apiFetch set Content-Type JSON
      // credentials: 'include' để gửi HTTPOnly cookie theo request
      const { getApiBase } = await import('@/lib/api')
      const res = await fetch(`${getApiBase()}/api/cv/upload`, {
        method: 'POST',
        credentials: 'include', // Gửi cookie thay vì Authorization header
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload thất bại')
      if (data.data) {
        const newCv = mapCvFromApi(data.data, userEmail || formData.email)
        if (data.data._id) setCvId(data.data._id)
        setFormData(newCv)
        setCvList((prev) => {
          const exists = prev.find((c) => c._id === data.data._id)
          if (exists) return prev.map((c) => c._id === data.data._id ? newCv : c)
          return [newCv, ...prev]
        })
        toast.success('Đã upload PDF, tạo vector AI và tự động trích xuất thông tin thành công!')
      } else {
        toast.success('Đã upload CV PDF và tạo vector AI embedding thành công!')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  const currentTheme = themeOptions.find((item) => item.key === theme) || themeOptions[1]
  const previewTextSize =
    fontScale === 'compact' ? 'text-xs' : fontScale === 'comfortable' ? 'text-sm' : 'text-[13px]'

  const labels = {
    vi: {
      pageTitle: 'CV Builder',
      pageSubtitle: cvId
        ? 'Hồ sơ đã được tải từ cơ sở dữ liệu. Chỉnh sửa và nhấn Lưu để cập nhật.'
        : 'Điền thông tin và nhấn Lưu để tạo hồ sơ. Tải PDF lên để AI embedding tự động.',
      toolsTitle: 'Công cụ',
      cvTemplate: 'Mẫu CV',
      cvTemplateValue: 'Modern Basic',
      language: 'Ngôn ngữ',
      color: 'Màu sắc',
      font: 'Cỡ chữ',
      profileTitle: 'Thông tin cơ bản',
      cvContentTitle: 'Nội dung CV',
      skillsTitle: 'Kỹ năng',
      importTitle: 'Import CV PDF (tạo AI Embedding)',
      importSubtitle: 'Upload PDF để hệ thống AI đọc và tạo vector cho tính năng matching.',
      noPdf: 'Chưa import file PDF.',
      imported: 'Đã import',
      objective: 'Mục tiêu nghề nghiệp',
      experience: 'Kinh nghiệm',
      education: 'Học vấn',
      certifications: 'Chứng chỉ',
      contact: 'Liên hệ',
      preview: 'Bản xem trước CV',
      fullName: 'Họ và tên',
      fullNamePlaceholder: 'Nguyễn Văn A',
      headline: 'Vị trí / Tiêu đề',
      headlinePlaceholder: 'Full Stack Developer',
      email: 'Email',
      phone: 'Số điện thoại',
      phonePlaceholder: '+84 901 234 567',
      location: 'Địa điểm',
      locationPlaceholder: 'Đà Nẵng, Việt Nam',
      dateOfBirth: 'Ngày sinh',
      address: 'Địa chỉ',
      addressPlaceholder: 'Quận 7, Đà Nẵng',
      website: 'Website / LinkedIn',
      objectivePlaceholder: 'Mục tiêu nghề nghiệp của bạn...',
      experiencePlaceholder: 'Mô tả kinh nghiệm làm việc...',
      educationPlaceholder: 'Trường học, chuyên ngành...',
      certificationsPlaceholder: 'Chứng chỉ, giải thưởng...',
      skillsPlaceholder: 'Thêm kỹ năng mới...',
      add: 'Thêm',
      loadingText: 'Đang tải hồ sơ...',
      importButton: 'Import CV (PDF)',
      processing: 'Đang xử lý...',
    },
    en: {
      pageTitle: 'CV Builder',
      pageSubtitle: cvId
        ? 'Profile loaded from database. Edit and click Save to update.'
        : 'Fill in your profile and click Save. Upload a PDF for AI embedding.',
      toolsTitle: 'Tools',
      cvTemplate: 'CV template',
      cvTemplateValue: 'Modern Basic',
      language: 'Language',
      color: 'Color theme',
      font: 'Font size',
      profileTitle: 'Basic profile',
      cvContentTitle: 'CV content',
      skillsTitle: 'Skills',
      importTitle: 'Import CV PDF (AI Embedding)',
      importSubtitle: 'Upload PDF so AI can read and generate a matching vector.',
      noPdf: 'No PDF imported yet.',
      imported: 'Imported',
      objective: 'Career Objective',
      experience: 'Experience',
      education: 'Education',
      certifications: 'Certifications',
      contact: 'Contact',
      preview: 'CV Live Preview',
      fullName: 'Full Name',
      fullNamePlaceholder: 'John Doe',
      headline: 'Job Title / Headline',
      headlinePlaceholder: 'Full Stack Developer',
      email: 'Email',
      phone: 'Phone Number',
      phonePlaceholder: '+84 901 234 567',
      location: 'Location',
      locationPlaceholder: 'Da Nang, Vietnam',
      dateOfBirth: 'Date of Birth',
      address: 'Address',
      addressPlaceholder: 'District 7, Da Nang',
      website: 'Website / LinkedIn',
      objectivePlaceholder: 'Your career objective...',
      experiencePlaceholder: 'Describe your work experience...',
      educationPlaceholder: 'Schools, majors...',
      certificationsPlaceholder: 'Certifications, awards...',
      skillsPlaceholder: 'Add a new skill...',
      add: 'Add',
      loadingText: 'Loading profile...',
      importButton: 'Import CV (PDF)',
      processing: 'Processing...',
    },
  }[language]

  if (loading) {
    return (
      <CandidateLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-foreground/70">{labels.loadingText}</span>
        </div>
      </CandidateLayout>
    )
  }

  return (
    <CandidateLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{labels.pageTitle}</h1>
            <p className="text-foreground/70">{labels.pageSubtitle}</p>
          </div>
          <Button onClick={handleSave} size="lg" className="gap-2" disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {cvId ? 'Cập nhật hồ sơ' : 'Lưu hồ sơ'}
          </Button>
        </div>

        {cvList.length > 0 && (
          <Card className="p-5 border border-border mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Danh sách CV của bạn ({cvList.length})
              </h2>
              <button
                type="button"
                onClick={() => { setCvId(null); setFormData({ ...emptyData, email: userEmail }); setImportedCvFileName(null) }}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tạo CV mới
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {cvList.map((cv) => {
                const isEditing = cvId === cv._id
                const isSettingThis = settingPrimary === cv._id
                const isDeletingThis = deletingId === cv._id
                return (
                  <div
                    key={cv._id}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all cursor-pointer ${
                      isEditing
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-foreground/[0.02]'
                    }`}
                    onClick={() => handleSelectCV(cv)}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isEditing ? 'bg-primary/10' : 'bg-foreground/5'}`}>
                      <FileText className={`w-4 h-4 ${isEditing ? 'text-primary' : 'text-foreground/50'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground truncate">{cv.name || 'CV chưa đặt tên'}</span>
                        {cv.isPrimary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            <Star className="w-3 h-3 fill-amber-500 stroke-amber-500" /> CV chính
                          </span>
                        )}
                        {isEditing && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                            <CheckCircle className="w-3 h-3" /> Đang chỉnh sửa
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {cv.headline && <span className="text-xs text-foreground/50 truncate">{cv.headline}</span>}
                        {cv.hasEmbedding ? (
                          <span className="text-xs text-green-600 flex items-center gap-0.5">⚡ AI ready</span>
                        ) : (
                          <span className="text-xs text-amber-600">Chưa có AI embedding</span>
                        )}
                        {cv.createdAt && (
                          <span className="text-xs text-foreground/40">
                            {new Date(cv.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {cv.fileUrl && (
                        <a
                          href={`${getApiBase()}/api/cv/${cv._id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-foreground/40 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Xem PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      {!cv.isPrimary && (
                        <button
                          type="button"
                          title="Đặt làm CV chính"
                          disabled={!!settingPrimary}
                          onClick={() => cv._id && handleSetPrimary(cv._id)}
                          className="p-1.5 rounded-lg text-foreground/40 hover:text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50"
                        >
                          {isSettingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        type="button"
                        title="Xóa CV này"
                        disabled={!!deletingId}
                        onClick={() => cv._id && handleDeleteCV(cv._id)}
                        className="p-1.5 rounded-lg text-foreground/40 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {isDeletingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 border border-border">
              <h2 className="text-xl font-semibold mb-5">{labels.toolsTitle}</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">{labels.cvTemplate}</p>
                  <div className="rounded-md border border-border px-3 py-2 text-sm text-foreground/80">
                    {labels.cvTemplateValue}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    {labels.language}
                  </p>
                  <Select value={language} onValueChange={(value: 'vi' | 'en') => handleLanguageChange(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vi">Tiếng Việt</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-5 mt-5">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    {labels.color}
                  </p>
                  <div className="flex items-center gap-2">
                    {themeOptions.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setTheme(item.key)}
                        className={`w-9 h-9 rounded-md border-2 transition ${
                          theme === item.key ? 'border-foreground scale-105' : 'border-border'
                        }`}
                        style={{ backgroundColor: item.color }}
                        title={item.label}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    {labels.font}
                  </p>
                  <div className="flex gap-2">
                    {(['compact', 'default', 'comfortable'] as const).map((size, i) => (
                      <Button
                        key={size}
                        type="button"
                        variant={fontScale === size ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFontScale(size)}
                      >
                        {i === 0 ? 'A-' : i === 2 ? 'A+' : 'A'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-border">
              <h2 className="text-xl font-semibold mb-5">{labels.profileTitle}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.fullName}</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={labels.fullNamePlaceholder} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.headline}</label>
                  <Input value={formData.headline} onChange={(e) => setFormData({ ...formData, headline: e.target.value })} placeholder={labels.headlinePlaceholder} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.email}</label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.phone}</label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder={labels.phonePlaceholder} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.location}</label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder={labels.locationPlaceholder} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.dateOfBirth}</label>
                  <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.address}</label>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={labels.addressPlaceholder} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.website}</label>
                  <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-border">
              <h2 className="text-xl font-semibold mb-5">{labels.cvContentTitle}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.objective}</label>
                  <Textarea rows={4} value={formData.objective} onChange={(e) => setFormData({ ...formData, objective: e.target.value })} placeholder={labels.objectivePlaceholder} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.experience}</label>
                  <Textarea rows={6} value={formData.experience} onChange={(e) => setFormData({ ...formData, experience: e.target.value })} placeholder={labels.experiencePlaceholder} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.education}</label>
                  <Textarea rows={3} value={formData.education} onChange={(e) => setFormData({ ...formData, education: e.target.value })} placeholder={labels.educationPlaceholder} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">{labels.certifications}</label>
                  <Textarea rows={2} value={formData.certifications} onChange={(e) => setFormData({ ...formData, certifications: e.target.value })} placeholder={labels.certificationsPlaceholder} />
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-border">
              <h2 className="text-xl font-semibold mb-5">{labels.skillsTitle}</h2>
              <div className="mb-5">
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <SkillTag key={skill} skill={skill} removable={true} onRemove={handleRemoveSkill} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder={labels.skillsPlaceholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAddSkill() }
                  }}
                />
                <Button type="button" onClick={handleAddSkill} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {labels.add}
                </Button>
              </div>
            </Card>

            <Card className="p-6 border border-border">
              <h2 className="text-xl font-semibold mb-3">{labels.importTitle}</h2>
              <p className="text-sm text-foreground/70 mb-4">{labels.importSubtitle}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label htmlFor="cv-import" className="inline-flex">
                  <Button asChild variant="outline" className="gap-2" disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                      {uploading ? labels.processing : labels.importButton}
                    </span>
                  </Button>
                </label>
                <input
                  id="cv-import"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleCvImport}
                  className="hidden"
                  disabled={uploading}
                />
                {importedCvFileName ? (
                  <p className="text-sm text-foreground/70">
                    {labels.imported}:{' '}
                    <span className="font-medium text-foreground">{importedCvFileName}</span>
                  </p>
                ) : (
                  <p className="text-sm text-foreground/60">{labels.noPdf}</p>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-6">
              <Card className="p-4 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">{labels.preview}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleExportPDF}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {exporting ? 'Đang xuất...' : 'Export PDF'}
                  </Button>
                </div>
                <div className="border border-border bg-white rounded-md shadow-sm overflow-hidden">
                  <div ref={cvPreviewRef} className="bg-white">
                    <div className={`px-5 py-4 text-white ${previewTextSize}`} style={{ backgroundColor: currentTheme.color }}>
                      <h3 className="text-lg font-bold">{formData.name || 'Họ và tên'}</h3>
                      <p className="opacity-90">{formData.headline || 'Vị trí công việc'}</p>
                    </div>
                    <div className={`p-5 ${previewTextSize}`}>
                      <section className="mb-4">
                        <h4 className="font-semibold mb-2" style={{ color: currentTheme.color }}>{labels.contact}</h4>
                        <p>{formData.email}</p>
                        <p>{formData.phone}</p>
                        <p>{formData.location}</p>
                        <p>{formData.address}</p>
                        {formData.website && <p>{formData.website}</p>}
                      </section>
                      {formData.objective && (
                        <section className="mb-4">
                          <h4 className="font-semibold mb-2" style={{ color: currentTheme.color }}>{labels.objective}</h4>
                          <p className="text-foreground/80 whitespace-pre-wrap">{formData.objective}</p>
                        </section>
                      )}
                      {formData.experience && (
                        <section className="mb-4">
                          <h4 className="font-semibold mb-2" style={{ color: currentTheme.color }}>{labels.experience}</h4>
                          <p className="text-foreground/80 whitespace-pre-wrap">{formData.experience}</p>
                        </section>
                      )}
                      {formData.education && (
                        <section className="mb-4">
                          <h4 className="font-semibold mb-2" style={{ color: currentTheme.color }}>{labels.education}</h4>
                          <p className="text-foreground/80 whitespace-pre-wrap">{formData.education}</p>
                        </section>
                      )}
                      {formData.skills.length > 0 && (
                        <section className="mb-4">
                          <h4 className="font-semibold mb-2" style={{ color: currentTheme.color }}>{labels.skillsTitle}</h4>
                          <div className="flex flex-wrap gap-2">
                            {formData.skills.map((skill, idx) => (
                              <span key={`${skill}-${idx}`} className="px-2 py-1 rounded text-xs border" style={{ borderColor: `${currentTheme.color}40`, color: currentTheme.color }}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        </section>
                      )}
                      {formData.certifications && (
                        <section>
                          <h4 className="font-semibold mb-2" style={{ color: currentTheme.color }}>{labels.certifications}</h4>
                          <p className="text-foreground/80 whitespace-pre-wrap">{formData.certifications}</p>
                        </section>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </CandidateLayout>
  )
}
