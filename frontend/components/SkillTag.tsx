import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type SkillTagProps = {
  skill: string
  onRemove?: (skill: string) => void
  removable?: boolean
  variant?: 'default' | 'match' | 'missing'
  className?: string
}

export default function SkillTag({
  skill,
  onRemove,
  removable = false,
  variant = 'default',
  className,
}: SkillTagProps) {
  const variantClasses = {
    default: 'bg-muted text-muted-foreground border-border',
    match: 'bg-primary-soft text-on-primary-soft border-transparent',
    missing: 'bg-card text-destructive border-border',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      <span>{skill}</span>
      {removable ? (
        <button
          type="button"
          onClick={() => onRemove?.(skill)}
          className="rounded-full p-0.5 transition-sr hover:bg-foreground/10"
          aria-label={`Xóa ${skill}`}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  )
}
