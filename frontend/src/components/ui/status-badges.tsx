import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

const baseToneClass = 'border'

const roleLabelMap: Record<Role, string> = {
  user: '受講者',
  reviewer: 'レビュアー',
  admin: '管理者',
}

const roleToneClassMap: Record<Role, string> = {
  user: 'border-sky-200 bg-sky-100 text-sky-700',
  reviewer: 'border-amber-200 bg-amber-100 text-amber-800',
  admin: 'border-violet-200 bg-violet-100 text-violet-800',
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Badge className={cn(baseToneClass, roleToneClassMap[role], className)}>
      {roleLabelMap[role]}
    </Badge>
  )
}

export function ActiveStateBadge({
  isActive,
  className,
}: {
  isActive: boolean
  className?: string
}) {
  return (
    <Badge
      className={cn(
        baseToneClass,
        isActive
          ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
          : 'border-slate-300 bg-slate-200 text-slate-700',
        className,
      )}
    >
      {isActive ? '有効' : '無効'}
    </Badge>
  )
}

export function VisibilityBadge({
  isVisible,
  className,
}: {
  isVisible: boolean
  className?: string
}) {
  return (
    <Badge
      className={cn(
        baseToneClass,
        isVisible
          ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
          : 'border-slate-300 bg-slate-200 text-slate-700',
        className,
      )}
    >
      {isVisible ? '表示中' : '非表示'}
    </Badge>
  )
}

export function EnabledBadge({
  isEnabled,
  enabledLabel = '有効',
  disabledLabel = '無効',
  className,
}: {
  isEnabled: boolean
  enabledLabel?: string
  disabledLabel?: string
  className?: string
}) {
  return (
    <Badge
      className={cn(
        baseToneClass,
        isEnabled
          ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
          : 'border-slate-300 bg-slate-200 text-slate-700',
        className,
      )}
    >
      {isEnabled ? enabledLabel : disabledLabel}
    </Badge>
  )
}
