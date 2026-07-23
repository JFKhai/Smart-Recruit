'use client'

import React, { useCallback, useEffect, useState } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/reviews/CompanyReview'
import { Eye, EyeOff, Loader2, MessageSquare, Star, ShieldAlert } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type AdminReview = {
  _id: string
  rating: number
  comment: string
  isAnonymous: boolean
  isHidden: boolean
  employerReply: string
  createdAt: string
  companyName: string
  candidateEmail: string
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<{ data: AdminReview[] }>('/api/reviews/admin/all')
      setReviews(res.data || [])
    } catch {
      toast.error('Không tải được danh sách đánh giá')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleHide = async (r: AdminReview) => {
    setActionId(r._id)
    try {
      await apiFetch(`/api/reviews/admin/${r._id}/hide`, {
        method: 'PATCH',
        body: JSON.stringify({ isHidden: !r.isHidden }),
      })
      setReviews((prev) =>
        prev.map((x) => (x._id === r._id ? { ...x, isHidden: !x.isHidden } : x))
      )
      toast.success(!r.isHidden ? 'Đã ẩn đánh giá (Bảo lưu bằng chứng)' : 'Đã hiện đánh giá công khai')
    } catch {
      toast.error('Thao tác thất bại')
    } finally {
      setActionId(null)
    }
  }

  const displayed = reviews.filter((r) =>
    filter === 'all' ? true : filter === 'hidden' ? r.isHidden : !r.isHidden
  )
  const hiddenCount = reviews.filter((r) => r.isHidden).length

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-gray-800 pb-5">
          <div className="flex items-center gap-3">
            <Star className="w-7 h-7 text-amber-400 fill-amber-400/20" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Kiểm duyệt Đánh giá Công ty</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Ẩn các đánh giá có nội dung vi phạm văn hóa hoặc công kích cá nhân. Dữ liệu gốc vẫn được lưu trữ bảo toàn bằng chứng trong DB.
            <span className="ml-2 text-violet-400 font-medium">(Tổng {reviews.length} đánh giá · {hiddenCount} đang ẩn)</span>
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {([
            ['all', 'Tất cả đánh giá'],
            ['visible', 'Đang hiển thị'],
            ['hidden', 'Đã ẩn (Vi phạm)'],
          ] as const).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-medium border transition-all duration-150',
                filter === f
                  ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-lg shadow-violet-500/10'
                  : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 bg-gray-900/40 rounded-xl border border-gray-800 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin text-amber-400 mb-2" />
            <p className="text-xs">Đang tải danh sách đánh giá...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-gray-900/40 rounded-xl border border-gray-800 space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto text-gray-600" />
            <p className="text-sm font-medium text-gray-400">Không có đánh giá nào phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((r) => (
              <div
                key={r._id}
                className={cn(
                  'p-5 rounded-xl border transition-all',
                  r.isHidden
                    ? 'border-red-900/50 bg-red-950/20'
                    : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
                )}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <StarRating value={r.rating} size={15} />
                      <span className="text-sm font-bold text-white">{r.companyName}</span>
                      {r.isHidden ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
                          Đã ẩn (Chỉ xem trong Admin)
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          Đang hiển thị công khai
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      Bởi: <span className="text-gray-300">{r.isAnonymous ? `${r.candidateEmail} (Ẩn danh)` : r.candidateEmail}</span> ·{' '}
                      {new Date(r.createdAt).toLocaleString('vi-VN')}
                    </p>

                    {r.comment && (
                      <p className="text-sm text-gray-200 bg-gray-950/60 p-3 rounded-lg border border-gray-800/80 leading-relaxed">
                        &quot;{r.comment}&quot;
                      </p>
                    )}

                    {r.employerReply && (
                      <div className="text-xs text-purple-300 bg-purple-950/20 p-2.5 rounded-lg border border-purple-900/30 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-purple-400">Phản hồi từ Nhà tuyển dụng:</span> {r.employerReply}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'gap-1.5 shrink-0 text-xs font-medium',
                      r.isHidden
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20 hover:bg-emerald-900/40'
                        : 'border-red-500/30 text-red-400 bg-red-950/20 hover:bg-red-900/40'
                    )}
                    disabled={actionId === r._id}
                    onClick={() => toggleHide(r)}
                  >
                    {actionId === r._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : r.isHidden ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                    {r.isHidden ? 'Hiện lại public' : 'Ẩn bài đánh giá'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
