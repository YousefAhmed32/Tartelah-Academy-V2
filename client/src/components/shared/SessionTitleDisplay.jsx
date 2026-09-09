import React from 'react'
import { BookOpen, Hash } from 'lucide-react'
import { formatSessionTitle, extractSessionIndexInfo } from '../../utils/sessionTitle.js'

/**
 * UI UX PRO MAX — SessionTitleDisplay
 * Renders high-contrast, informative session titles with structured badges for quota & student identity.
 */
export default function SessionTitleDisplay({ session, subtitle = null, size = 'md', className = '' }) {
  if (!session) return <span className="text-gray-400">حصة غير محددة</span>

  const formatted = formatSessionTitle(session)
  const indexInfo = extractSessionIndexInfo(formatted)

  // Clean title without the parenthesized count if we render it as a badge
  let cleanTitle = formatted
  if (indexInfo?.label) {
    cleanTitle = cleanTitle.replace(/\s*\([^)]+\)/, '').trim()
  }

  const isSmall = size === 'sm'

  return (
    <div className={`flex flex-col gap-0.5 ${className}`} dir="rtl">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-heading font-bold text-gray-900 ${isSmall ? 'text-xs' : 'text-sm'}`}>
          {cleanTitle}
        </span>
        {indexInfo && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-100/90 shrink-0">
            <Hash size={11} className="text-violet-500" />
            {indexInfo.label}
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
