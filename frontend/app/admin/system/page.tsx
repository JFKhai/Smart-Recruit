'use client'

import React, { useCallback, useEffect, useState } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import { apiFetch } from '@/lib/api'
import { Server, RefreshCw, CheckCircle, XCircle, Cpu, Database, Zap, Bell, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type SystemInfo = {
  server: {
    uptime: string
    uptimeSeconds: number
    nodeEnv: string
    nodeVersion: string
    platform: string
    memoryUsageMB: number
  }
  database: {
    status: string
    readyState: number
    host: string
    name: string
  }
  services: {
    aiServiceUrl: string
    cronSchedule: string
  }
  notifications: {
    total: number
    softDeleted: number
  }
  cvs: {
    withEmbedding: number
  }
}

function InfoRow({ label, value, badge }: { label: string; value: string | number; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        {badge}
        <span className="text-sm text-gray-100 font-medium">{value}</span>
      </div>
    </div>
  )
}

function SectionCard({ icon: Icon, title, color, children }: { icon: React.ElementType; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Icon className={cn('w-4 h-4', color)} />
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function AdminSystemPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)

  // Email matching settings states
  const [isEnabled, setIsEnabled] = useState(true)
  const [scheduleType, setScheduleType] = useState('daily')
  const [cronExpression, setCronExpression] = useState('0 7,17 * * *')
  const [savingSettings, setSavingSettings] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: { isEnabled: boolean; scheduleType: string; cronExpression: string } }>(
        '/api/admin/system/email-settings'
      )
      setIsEnabled(res.data.isEnabled)
      setScheduleType(res.data.scheduleType)
      setCronExpression(res.data.cronExpression)
    } catch {
      // silent
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ data: SystemInfo }>('/api/admin/system')
      setInfo(res.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    loadSettings()
  }, [load, loadSettings])

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      await apiFetch('/api/admin/system/email-settings', {
        method: 'PUT',
        body: JSON.stringify({ isEnabled, scheduleType, cronExpression }),
      })
      toast.success('Cập nhật cấu hình email thành công!')
      load() // Tải lại thông tin hệ thống để cập nhật chuỗi cron hiển thị
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu cấu hình thất bại.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleTriggerMatching = async (isTest = false) => {
    setTriggering(true)
    try {
      const url = isTest ? '/api/admin/trigger-matching?test=true' : '/api/admin/trigger-matching'
      const res = await apiFetch<{ message: string; data: any }>(url, {
        method: 'POST',
      })
      if (isTest) {
        toast.success(`Đã gửi email test thành công đến: ${res.data.receiver}!`)
      } else {
        toast.success(
          `Thành công: Đã quét ${res.data.candidatesProcessed} ứng viên và khớp ${res.data.openJobsCount} tin tuyển dụng!`
        )
      }
      load() // Tải lại thông tin hệ thống để cập nhật stats
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thao tác kích hoạt thất bại.')
    } finally {
      setTriggering(false)
    }
  }

  const dbConnected = info?.database.readyState === 1

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
              <Server className="w-7 h-7 text-cyan-400" /> Tác vụ Hệ thống
            </h1>
            <p className="text-gray-400">Trạng thái và thông tin hoạt động của server</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2 border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Làm mới
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[...Array(4)].map((_, i) => <div key={i} className="h-56 bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : info ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SectionCard icon={Cpu} title="Thông tin Server" color="text-cyan-400">
              <InfoRow label="Uptime" value={info.server.uptime} />
              <InfoRow label="Môi trường" value={info.server.nodeEnv} />
              <InfoRow label="Node.js" value={info.server.nodeVersion} />
              <InfoRow label="Platform" value={info.server.platform} />
              <InfoRow
                label="Bộ nhớ sử dụng"
                value={`${info.server.memoryUsageMB} MB`}
                badge={
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    info.server.memoryUsageMB > 300
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-green-500/15 text-green-400'
                  )}>
                    {info.server.memoryUsageMB > 300 ? 'Cao' : 'Bình thường'}
                  </span>
                }
              />
            </SectionCard>

            <SectionCard icon={Database} title="Cơ sở dữ liệu" color="text-emerald-400">
              <InfoRow
                label="Kết nối MongoDB"
                value={info.database.status}
                badge={
                  dbConnected
                    ? <CheckCircle className="w-4 h-4 text-green-400" />
                    : <XCircle className="w-4 h-4 text-red-400" />
                }
              />
              <InfoRow label="Host" value={info.database.host || '—'} />
              <InfoRow label="Database" value={info.database.name || '—'} />
            </SectionCard>

            <SectionCard icon={Zap} title="Dịch vụ tích hợp" color="text-violet-400">
              <InfoRow
                label="AI Service URL"
                value={info.services.aiServiceUrl}
                badge={
                  info.services.aiServiceUrl !== '(Chưa cấu hình)'
                    ? <CheckCircle className="w-4 h-4 text-green-400" />
                    : <XCircle className="w-4 h-4 text-amber-400" />
                }
              />
              <div className="py-3 border-b border-gray-800">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-gray-400">Cron Job</span>
                  <div className="text-right">
                    {info.services.cronSchedule.includes('Tắt') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                        Đang tắt
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                        Đang chạy
                      </span>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{info.services.cronSchedule}</p>
                  </div>
                </div>
              </div>
              <InfoRow label="CV có AI Embedding" value={info.cvs.withEmbedding} />

              {/* 🛠️ CẤU HÌNH GỬI EMAIL matching */}
              <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cấu hình lịch gửi email</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Trạng thái tự động</label>
                    <Select
                      value={isEnabled ? 'true' : 'false'}
                      onValueChange={(val) => setIsEnabled(val === 'true')}
                    >
                      <SelectTrigger className="h-8 bg-gray-850 border-gray-800 text-xs text-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800">
                        <SelectItem value="true" className="text-xs text-gray-200">Kích hoạt</SelectItem>
                        <SelectItem value="false" className="text-xs text-gray-200 font-medium">Vô hiệu hóa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Tần suất gửi</label>
                    <Select
                      value={scheduleType}
                      onValueChange={(val) => setScheduleType(val)}
                    >
                      <SelectTrigger className="h-8 bg-gray-850 border-gray-800 text-xs text-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800">
                        <SelectItem value="demo" className="text-xs text-gray-200">Mỗi phút (Demo)</SelectItem>
                        <SelectItem value="hourly" className="text-xs text-gray-200">Mỗi giờ</SelectItem>
                        <SelectItem value="daily" className="text-xs text-gray-200">Hàng ngày (7h & 17h)</SelectItem>
                        <SelectItem value="weekly" className="text-xs text-gray-200">Hàng tuần (Thứ 2)</SelectItem>
                        <SelectItem value="custom" className="text-xs text-gray-200">Tùy chỉnh (Cron Expression)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {scheduleType === 'custom' && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Biểu thức Cron</label>
                    <Input
                      type="text"
                      value={cronExpression}
                      onChange={(e) => setCronExpression(e.target.value)}
                      placeholder="e.g., 0 9 * * *"
                      className="h-8 bg-gray-850 border-gray-800 text-xs text-gray-200 font-mono"
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="h-7 bg-violet-600 hover:bg-violet-700 text-white text-xs px-3"
                  >
                    {savingSettings ? 'Đang lưu...' : 'Lưu cài đặt'}
                  </Button>
                </div>
              </div>

              {/* ⚡ TÁC VỤ KÍCH HOẠT THỦ CÔNG */}
              <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <span className="text-[11px] text-gray-500 max-w-md">
                  Gửi email matching giả lập (Test) hoặc quét cơ sở dữ liệu để so khớp thật ngay lập tức.
                </span>
                <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTriggerMatching(true)}
                    disabled={triggering}
                    className="border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white gap-1.5 text-xs h-8"
                  >
                    <Play className={cn("w-3 h-3 fill-current", triggering && "animate-spin")} />
                    Gửi Email Test
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleTriggerMatching(false)}
                    disabled={triggering}
                    className="bg-violet-600 hover:bg-violet-700 text-white border-none gap-1.5 text-xs h-8"
                  >
                    <Play className={cn("w-3 h-3 fill-current", triggering && "animate-spin")} />
                    {triggering ? "Đang quét..." : "Quét & Gửi Ngay"}
                  </Button>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Bell} title="Thông báo hệ thống" color="text-amber-400">
              <InfoRow label="Tổng thông báo" value={info.notifications.total} />
              <InfoRow
                label="Đã xóa mềm (soft-deleted)"
                value={info.notifications.softDeleted}
                badge={
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-400">Ẩn khỏi UI</span>
                }
              />
              <InfoRow
                label="Thông báo hiển thị"
                value={info.notifications.total - info.notifications.softDeleted}
              />
              <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-400">
                  💡 Hệ thống dùng <strong className="text-gray-200">Soft-Delete</strong> — thông báo bị xóa được đánh dấu <code className="bg-gray-700 px-1 rounded text-violet-300">isDeleted: true</code>, không bị xóa khỏi DB để tránh cron job tạo lại.
                </p>
              </div>
            </SectionCard>
          </div>
        ) : (
          <p className="text-gray-500">Không tải được thông tin hệ thống.</p>
        )}
      </div>
    </AdminLayout>
  )
}
