import React from 'react'
import { Hash, CheckCircle2, History } from 'lucide-react'
import { formatSessionTitle, extractSessionIndexInfo } from '../../utils/sessionTitle.js'

/**
 * UI UX PRO MAX — SessionTitleDisplay
 * Renders high-contrast, informative session titles with structured badges for quota & student identity.
 */
export default function SessionTitleDisplay({
  session,
  subtitle = null,
  size = 'md',
  showStatusIndicator = false,
  className = '',
}) {
  if (!session) return <span className="text-gray-400">حصة غير محددة</span>

  const formatted = formatSessionTitle(session)
  const isSmall = size === 'sm'
  const isLarge = size === 'lg'
  const isPastApproved =
    session.notes?.includes('حصة سابقة معتمدة') ||
    session.payrollStatusReason?.includes('حصة سابقة معتمدة')

  return (
    <div className={`flex flex-col gap-0.5 ${className}`} dir="rtl">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`font-heading font-bold text-gray-900 ${
            isSmall ? 'text-xs' : isLarge ? 'text-base' : 'text-sm'
          }`}
        >
          {formatted}
        </span>

        {isPastApproved && (
          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100/60 text-amber-900 border border-amber-200/50">
            سابقة معتمدة
          </span>
        )}

        {isPastApproved && (
          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100/60 text-amber-900 border border-amber-200/50">
            سابقة معتمدة
          </span>
        )}

        {showStatusIndicator && session.status === 'completed' && !isPastApproved && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/50">
            <CheckCircle2 size={10} className="text-emerald-600" />
            منجزة
          </span>
        )}
      </div>

      {subtitle && (
        <span className="text-xs text-[#7c6aaa] leading-tight">
          {subtitle}
        </span>
      )}
    </div>
  )
}
