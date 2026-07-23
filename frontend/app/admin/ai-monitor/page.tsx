'use client'

import React, { useCallback, useEffect, useState } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import { apiFetch } from '@/lib/api'
import { Cpu, RefreshCw, AlertTriangle, CheckCircle2, Clock, RotateCcw, FileText, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type CvItem = {
  _id: string
  fullName: string
  email: string
  headline?: string
  processingStatus: 'queued' | 'processing' | 'ready' | 'completed' | 'failed'
  processingError?: string
  attempts?: number
  lastAiAttemptAt?: string
  fileUrl?: string
  createdAt: string
  updatedAt: string
}

type AiStats = {
  total: number
  ready: number
  failed: number
  processing: number
  queued: number
}

export default function AiMonitorPage() {
  const [cvs, setCvs] = useState<CvItem[]>([])
  const [stats, setStats] = useState<AiStats>({ total: 0, ready: 0, failed: 0, processing: 0, queued: 0 })
  const [loading, setLoading] = useState(true)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [retryingAll, setRetryingAll] = useState(false)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchAiMonitor = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '15')
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)

      const res = await apiFetch<{ stats: AiStats; data: CvItem[]; total: number; pages: number }>(
        `/api/admin/ai-monitor?${params.toString()}`
      )

      setCvs(res.data || [])
      setStats(res.stats || { total: 0, ready: 0, failed: 0, processing: 0, queued: 0 })
      setPages(res.pages || 1)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định'
      toast.error(`Không thể tải thông tin AI Monitor: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchAiMonitor()
  }, [fetchAiMonitor])

  const handleRetrySingle = async (cvId: string) => {
    setRetryingId(cvId)
    try {
      await apiFetch(`/api/admin/ai-monitor/${cvId}/retry`, { method: 'POST' })
      toast.success('Đã xếp hàng chạy lại AI cho CV thành công!')
      fetchAiMonitor()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định'
      toast.error(`Thao tác thất bại: ${errorMsg}`)
    } finally {
      setRetryingId(null)
    }
  }

  const handleRetryAllFailed = async () => {
    if (stats.failed === 0) {
      toast.info('Không có CV nào ở trạng thái lỗi.')
      return
    }

    setRetryingAll(true)
    try {
      const res = await apiFetch<{ message: string; queuedCount: number }>('/api/admin/ai-monitor/retry-all-failed', {
        method: 'POST',
      })
      toast.success(res.message || `Đã xếp hàng ${res.queuedCount} CV bị lỗi để xử lý lại AI!`)
      fetchAiMonitor()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định'
      toast.error(`Thao tác thất bại: ${errorMsg}`)
    } finally {
      setRetryingAll(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="w-7 h-7 text-purple-400" />
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Worker & CV Processing Monitor</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Giám sát tiến trình bóc tách CV qua AI / OCR và ép chạy lại (Re-try) cho các hồ sơ gặp sự cố mạng hoặc rate-limit.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleRetryAllFailed}
              disabled={retryingAll || stats.failed === 0}
              className="bg-purple-600 hover:bg-purple-500 text-white gap-2 shadow-lg shadow-purple-600/20"
            >
              <RotateCcw className={`w-4 h-4 ${retryingAll ? 'animate-spin' : ''}`} />
              Chạy lại tất cả CV lỗi ({stats.failed})
            </Button>

            <Button
              onClick={fetchAiMonitor}
              disabled={loading}
              variant="outline"
              className="border-gray-800 bg-gray-900/60 hover:bg-gray-800 text-gray-300 gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">Đã bóc tách AI thành công</p>
              <p className="text-2xl font-bold text-white mt-0.5">{stats.ready}</p>
            </div>
          </div>

          <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">Xử lý thất bại (Lỗi)</p>
              <p className="text-2xl font-bold text-red-400 mt-0.5">{stats.failed}</p>
            </div>
          </div>

          <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">Đang xử lý AI</p>
              <p className="text-2xl font-bold text-white mt-0.5">{stats.processing}</p>
            </div>
          </div>

          <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">Đang xếp hàng (Queued)</p>
              <p className="text-2xl font-bold text-white mt-0.5">{stats.queued}</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center justify-between bg-gray-900/40 p-4 rounded-xl border border-gray-800">
          <p className="text-sm font-medium text-gray-300">Danh sách hồ sơ CV</p>
          <div className="w-56">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="bg-gray-950 border-gray-800 text-white">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800 text-white">
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="failed">Lỗi (Failed)</SelectItem>
                <SelectItem value="ready">Thành công (Ready)</SelectItem>
                <SelectItem value="processing">Đang xử lý (Processing)</SelectItem>
                <SelectItem value="queued">Hàng đợi (Queued)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-gray-900/40 rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-950/80 text-gray-400 text-xs uppercase font-medium border-b border-gray-800">
                <tr>
                  <th className="py-3.5 px-4">Ứng viên / Hồ sơ</th>
                  <th className="py-3.5 px-4">Trạng thái AI</th>
                  <th className="py-3.5 px-4">Chi tiết lỗi (nếu có)</th>
                  <th className="py-3.5 px-4">Số lần thử</th>
                  <th className="py-3.5 px-4">Cập nhật cuối</th>
                  <th className="py-3.5 px-4 text-right">Thao tác Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                      Đang tải danh sách AI Monitor...
                    </td>
                  </tr>
                ) : cvs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      Không tìm thấy hồ sơ CV nào khớp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  cvs.map((cv) => {
                    const isFailed = cv.processingStatus === 'failed'
                    const isReady = cv.processingStatus === 'ready' || cv.processingStatus === 'completed'
                    const isProcessing = cv.processingStatus === 'processing'

                    return (
                      <tr key={cv._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="text-white text-sm font-medium">{cv.fullName}</p>
                            <p className="text-gray-400 text-xs">{cv.email}</p>
                            {cv.headline && <p className="text-gray-500 text-[11px] truncate max-w-xs">{cv.headline}</p>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isReady && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Thành công
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <AlertTriangle className="w-3.5 h-3.5" /> Xử lý thất bại
                            </span>
                          )}
                          {isProcessing && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <Zap className="w-3.5 h-3.5 animate-pulse" /> Đang chạy AI
                            </span>
                          )}
                          {!isReady && !isFailed && !isProcessing && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3.5 h-3.5" /> Hàng đợi
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {cv.processingError ? (
                            <span className="text-xs text-red-400/90 font-mono bg-red-950/30 p-1.5 rounded border border-red-900/30 block truncate">
                              {cv.processingError}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs text-gray-300">{cv.attempts || 0} lần</td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-400">
                          {new Date(cv.updatedAt).toLocaleString('vi-VN')}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={retryingId === cv._id}
                            onClick={() => handleRetrySingle(cv._id)}
                            className="border-gray-800 bg-gray-950 text-purple-300 hover:bg-purple-900/30 hover:text-purple-200 border-purple-500/20 gap-1.5"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${retryingId === cv._id ? 'animate-spin' : ''}`} />
                            Chạy lại AI
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-800 text-xs text-gray-400">
              <p>Tổng số CV: {stats.total}</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="border-gray-800 bg-gray-950 text-gray-300 hover:bg-gray-800"
                >
                  Trang trước
                </Button>
                <span>
                  Trang <strong>{page}</strong> / {pages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-gray-800 bg-gray-950 text-gray-300 hover:bg-gray-800"
                >
                  Trang sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
