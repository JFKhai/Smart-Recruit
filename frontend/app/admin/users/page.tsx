'use client'

import React, { useCallback, useEffect, useState } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Users, Search, RefreshCw, Shield, ShieldOff, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type User = {
  _id: string
  email: string
  role: 'candidate' | 'employer' | 'admin'
  status: 'active' | 'banned'
  createdAt: string
  googleId?: string
  facebookId?: string
}

const roleLabel: Record<string, string> = { candidate: 'Ứng viên', employer: 'Nhà tuyển dụng', admin: 'Admin' }
const roleCls: Record<string, string> = {
  candidate: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  employer: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  admin: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (statusFilter) params.set('status', statusFilter)
      const res = await apiFetch<{ data: User[]; total: number; pages: number }>(`/api/admin/users?${params}`)
      setUsers(res.data)
      setTotal(res.total)
      setPages(res.pages)
    } catch {
      toast.error('Không tải được danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (id: string, newStatus: 'active' | 'banned') => {
    setActionLoading(id + '-status')
    try {
      await apiFetch(`/api/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) })
      toast.success(newStatus === 'banned' ? 'Đã khoá tài khoản' : 'Đã kích hoạt tài khoản')
      setUsers(prev => prev.map(u => u._id === id ? { ...u, status: newStatus } : u))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Thao tác thất bại')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResetPasswordRequest = async (id: string, email: string) => {
    if (!confirm(`Gửi email hỗ trợ đặt lại mật khẩu khẩn cấp tới "${email}"?`)) return
    setActionLoading(id + '-reset-pwd')
    try {
      const res = await apiFetch<{ message: string }>(`/api/admin/users/${id}/reset-password-request`, { method: 'POST' })
      toast.success(res.message || 'Đã gửi email hỗ trợ đặt lại mật khẩu!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Thao tác thất bại')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Hủy kích hoạt & Lưu trữ (xóa mềm) tài khoản "${email}"? Dữ liệu xin việc lịch sử sẽ được bảo toàn.`)) return
    setActionLoading(id + '-delete')
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      toast.success('Đã lưu trữ (xóa mềm) tài khoản')
      setUsers(prev => prev.filter(u => u._id !== id))
      setTotal(t => t - 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xóa thất bại')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
              <Users className="w-7 h-7 text-violet-400" /> Quản lý Tài khoản
            </h1>
            <p className="text-gray-400">{total} tài khoản tổng cộng</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2 border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Làm mới
          </Button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm theo email..."
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Tất cả Role</option>
            <option value="candidate">Ứng viên</option>
            <option value="employer">Nhà tuyển dụng</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">Tất cả Trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="banned">Bị khoá</option>
          </select>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Đăng ký</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((__, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-500">Không tìm thấy tài khoản nào</td>
                  </tr>
                ) : users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-gray-100 font-medium">{user.email}</p>
                        {(user.googleId || user.facebookId) && (
                          <p className="text-xs text-gray-500 mt-0.5">{user.googleId ? 'Google' : 'Facebook'}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', roleCls[user.role])}>
                        {roleLabel[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {user.status === 'banned' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">Bị khoá</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/20">Hoạt động</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {user.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetPasswordRequest(user._id, user.email)}
                            disabled={actionLoading === user._id + '-reset-pwd'}
                            className="h-7 text-xs gap-1 border-violet-500/30 text-violet-300 hover:bg-violet-500/10 bg-transparent"
                          >
                            🔑 Đặt lại MK
                          </Button>
                        )}

                        {user.role !== 'admin' && (
                          user.status === 'banned' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(user._id, 'active')}
                              disabled={actionLoading === user._id + '-status'}
                              className="h-7 text-xs gap-1 border-green-500/30 text-green-400 hover:bg-green-500/10 bg-transparent"
                            >
                              <Shield className="w-3 h-3" /> Kích hoạt
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(user._id, 'banned')}
                              disabled={actionLoading === user._id + '-status'}
                              className="h-7 text-xs gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                            >
                              <ShieldOff className="w-3 h-3" /> Khoá
                            </Button>
                          )
                        )}
                        {user.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(user._id, user.email)}
                            disabled={actionLoading === user._id + '-delete'}
                            className="h-7 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
                          >
                            <Trash2 className="w-3 h-3" /> Xóa mềm
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between">
              <p className="text-sm text-gray-400">Trang {page} / {pages}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="h-8 border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 gap-1">
                  <ChevronLeft className="w-4 h-4" /> Trước
                </Button>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                  className="h-8 border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 gap-1">
                  Sau <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
