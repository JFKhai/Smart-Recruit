'use client'

import React, { useCallback, useEffect, useState } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import { apiFetch } from '@/lib/api'
import { FileCheck2, Search, RefreshCw, Filter, ShieldAlert, User, Clock, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

type AuditLogItem = {
  _id: string
  adminId?: {
    _id: string
    fullName: string
    email: string
    role: string
  }
  action: string
  targetModel: string
  targetId?: string
  details?: Record<string, unknown>
  ipAddress: string
  userAgent: string
  createdAt: string
}

const ACTION_LABELS: Record<string, { label: string; badgeClass: string }> = {
  LOCK_USER: { label: 'Khóa tài khoản', badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20' },
  UNLOCK_USER: { label: 'Mở khóa tài khoản', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  DELETE_USER: { label: 'Xóa tài khoản', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  APPROVE_JOB: { label: 'Duyệt Job', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  REJECT_JOB: { label: 'Đóng Job', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  DELETE_JOB: { label: 'Xóa Job', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  RETRY_AI_PARSING: { label: 'Chạy lại AI CV', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  CREATE_SYSTEM_BROADCAST: { label: 'Phát thông báo', badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  UPDATE_SYSTEM_SETTINGS: { label: 'Sửa cấu hình hệ thống', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '15')
      if (search) params.set('search', search)
      if (actionFilter && actionFilter !== 'all') params.set('action', actionFilter)

      const res = await apiFetch<{ data: AuditLogItem[]; total: number; pages: number }>(`/api/admin/audit-logs?${params.toString()}`)
      setLogs(res.data || [])
      setTotal(res.total || 0)
      setPages(res.pages || 1)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định'
      toast.error(`Không thể tải nhật ký Audit: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }, [page, search, actionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-7 h-7 text-violet-400" />
              <h1 className="text-2xl font-bold text-white tracking-tight">Nhật ký Audit (System Audit Logs)</h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Ghi vết 100% mọi thao tác quản trị an ninh, thay đổi cấu hình và tác động tài khoản của Admin.
            </p>
          </div>

          <Button
            onClick={fetchLogs}
            disabled={loading}
            variant="outline"
            className="border-gray-800 bg-gray-900/60 hover:bg-gray-800 text-gray-300 gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
            <Input
              placeholder="Tìm theo email Admin hoặc IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9 bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 shrink-0" />
            <Select
              value={actionFilter}
              onValueChange={(val) => {
                setActionFilter(val)
                setPage(1)
              }}
            >
              <SelectTrigger className="bg-gray-950 border-gray-800 text-white">
                <SelectValue placeholder="Lọc theo hành động" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800 text-white">
                <SelectItem value="all">Tất cả hành động</SelectItem>
                <SelectItem value="LOCK_USER">Khóa tài khoản</SelectItem>
                <SelectItem value="UNLOCK_USER">Mở khóa tài khoản</SelectItem>
                <SelectItem value="DELETE_USER">Xóa tài khoản</SelectItem>
                <SelectItem value="APPROVE_JOB">Duyệt Job</SelectItem>
                <SelectItem value="REJECT_JOB">Đóng Job</SelectItem>
                <SelectItem value="DELETE_JOB">Xóa Job</SelectItem>
                <SelectItem value="RETRY_AI_PARSING">Chạy lại AI CV</SelectItem>
                <SelectItem value="CREATE_SYSTEM_BROADCAST">Phát thông báo</SelectItem>
                <SelectItem value="UPDATE_SYSTEM_SETTINGS">Sửa cấu hình hệ thống</SelectItem>
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
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Admin thực hiện</th>
                  <th className="py-3.5 px-4">Hành động</th>
                  <th className="py-3.5 px-4">Đối tượng (Target)</th>
                  <th className="py-3.5 px-4">Địa chỉ IP</th>
                  <th className="py-3.5 px-4">Chi tiết payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-violet-400" />
                      Đang tải nhật ký Audit...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      Chưa có ghi vết nhật ký audit nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const actionInfo = ACTION_LABELS[log.action] || {
                      label: log.action,
                      badgeClass: 'bg-gray-800 text-gray-400 border-gray-700',
                    }

                    return (
                      <tr key={log._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-xs font-bold">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="text-white text-xs font-medium">{log.adminId?.fullName || log.adminId?.email || 'System'}</p>
                              <p className="text-gray-500 text-[11px]">{log.adminId?.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${actionInfo.badgeClass}`}
                          >
                            {actionInfo.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          <span className="text-violet-300 font-medium">{log.targetModel}</span>
                          {log.targetId && (
                            <span className="text-gray-500 block font-mono text-[10px]">
                              ID: {log.targetId.substring(0, 12)}...
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-gray-400">
                          {log.ipAddress}
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono text-gray-400">
                          {log.details ? (
                            <div className="bg-gray-950 p-2 rounded border border-gray-800 max-w-xs overflow-x-auto text-[11px] text-emerald-400/90">
                              {JSON.stringify(log.details)}
                            </div>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
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
              <p>Tổng số <strong>{total}</strong> bản ghi nhật ký</p>
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
