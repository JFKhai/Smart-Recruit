'use client'

import React from 'react'
import Link from 'next/link'
import { Heart, MapPin, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'
import MatchBadge from '@/components/MatchBadge'
import SkillTag from '@/components/SkillTag'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export type JobCardProps = {
  id: string
  title: string
  company: string
  logo?: string | null
  location?: string
  /** Chuỗi lương từ API Job.salary */
  salary?: string
  /** Legacy dashboard */
  salaryMin?: number
  salaryMax?: number
  currency?: string
  experience?: string
  workType?: string
  skills?: string[]
  /** null = nhắc cập nhật CV; undefined = ẩn */
  matchScore?: number | null
  hot?: boolean
  postedDate?: Date | string
  href?: string
  saved?: boolean
  onSaveClick?: (e: React.MouseEvent) => void
  onClick?: () => void
  className?: string
  showActions?: boolean
  /** @deprecated giữ tương thích trang cũ */
  aiInsight?: string
}

function formatSalary({
  salary,
  salaryMin,
  salaryMax,
  currency = 'VND',
}: Pick<JobCardProps, 'salary' | 'salaryMin' | 'salaryMax' | 'currency'>): string | null {
  if (salary?.trim()) return salary
  if (salaryMin == null && salaryMax == null) return null
  if (salaryMin != null && salaryMax != null) {
    return `${salaryMin.toLocaleString('vi-VN')}–${salaryMax.toLocaleString('vi-VN')} ${currency}`
  }
  if (salaryMin != null) return `Từ ${salaryMin.toLocaleString('vi-VN')} ${currency}`
  return `Đến ${salaryMax!.toLocaleString('vi-VN')} ${currency}`
}

function companyInitial(name: string) {
  return (name.trim().charAt(0) || '?').toUpperCase()
}

function daysAgoLabel(postedDate?: Date | string) {
  if (!postedDate) return null
  const d = typeof postedDate === 'string' ? new Date(postedDate) : postedDate
  if (Number.isNaN(d.getTime())) return null
  const days = Math.max(
    0,
    Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)),
  )
  if (days === 0) return 'Hôm nay'
  if (days === 1) return '1 ngày trước'
  return `${days} ngày trước`
}

export default function JobCard({
  id,
  title,
  company,
  logo,
  location,
  salary,
  salaryMin,
  salaryMax,
  currency,
  experience,
  workType,
  skills = [],
  matchScore,
  hot,
  postedDate,
  href,
  saved,
  onSaveClick,
  onClick,
  className,
  showActions = false,
}: JobCardProps) {
  const salaryText = formatSalary({ salary, salaryMin, salaryMax, currency })
  const to = href ?? `/jobs/${id}`
  const ago = daysAgoLabel(postedDate)
  const skillSlice = skills.slice(0, 3)

  const content = (
    <div className="flex items-start gap-4">
      <div
        className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card text-sm font-semibold text-primary"
        aria-hidden
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="size-full object-cover" />
        ) : (
          companyInitial(company)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold leading-snug text-foreground line-clamp-2">
                {title}
              </h3>
              {hot ? <Badge variant="hot">HOT</Badge> : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{company}</p>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            <MatchBadge score={matchScore} size="sm" />
            {onSaveClick ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                aria-label={saved ? 'Bỏ lưu tin' : 'Lưu tin'}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onSaveClick(e)
                }}
              >
                <Heart
                  className={cn('size-4', saved && 'fill-primary text-primary')}
                />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {salaryText ? (
            <span className="font-medium text-primary">{salaryText}</span>
          ) : null}
          {location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden />
              {location}
            </span>
          ) : null}
          {experience ? (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="size-3.5" aria-hidden />
              {experience}
            </span>
          ) : null}
          {workType ? <span>{workType}</span> : null}
        </div>

        {skillSlice.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skillSlice.map((skill) => (
              <SkillTag key={skill} skill={skill} />
            ))}
            {skills.length > 3 ? (
              <span className="text-xs text-muted-foreground">
                +{skills.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}

        {ago || showActions ? (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            {ago ? (
              <span className="text-xs text-muted-foreground">{ago}</span>
            ) : (
              <span />
            )}
            {showActions ? (
              <span className="text-sm font-semibold text-primary">Xem chi tiết</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )

  const shellClass = cn(
    'block rounded-lg border border-border bg-card p-4 shadow-card transition-sr hover:shadow-card-hover',
    className,
  )

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={cn(shellClass, 'cursor-pointer')}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClick()
        }}
      >
        {content}
      </div>
    )
  }

  return (
    <Link href={to} className={shellClass}>
      {content}
    </Link>
  )
}
