'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export type MegaMenuItem = {
  label: string
  href?: string
  /** true = nút trống / sắp ra mắt — bấm không điều hướng */
  stub?: boolean
  description?: string
  icon?: React.ReactNode
}

export type MegaMenuSection = {
  title: string
  items: MegaMenuItem[]
}

type MegaMenuProps = {
  sections: MegaMenuSection[]
  className?: string
  onNavigate?: () => void
}

export default function MegaMenu({
  sections,
  className,
  onNavigate,
}: MegaMenuProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-popover',
        className,
      )}
      role="menu"
    >
      <div
        className={cn(
          'grid gap-6',
          sections.length >= 3
            ? 'md:grid-cols-3'
            : sections.length === 2
              ? 'md:grid-cols-2'
              : 'grid-cols-1',
        )}
      >
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={`${section.title}-${item.label}`}>
                  {item.stub || !item.href ? (
                    <span
                      className="flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm text-placeholder"
                      title="Sắp ra mắt"
                      aria-disabled
                    >
                      {item.icon}
                      <span>
                        {item.label}
                        <span className="ml-1 text-[10px] uppercase text-placeholder">
                          Sắp có
                        </span>
                      </span>
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      role="menuitem"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-sr hover:bg-primary-soft hover:text-on-primary-soft"
                      onClick={onNavigate}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
