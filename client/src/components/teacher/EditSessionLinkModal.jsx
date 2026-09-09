import { useState, useEffect, useId } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Video, Link2, ExternalLink, Check, Sparkles, AlertCircle } from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { MEETING_PROVIDERS } from '../../config/constants.js'

function detectProvider(url) {
  if (!url || typeof url !== 'string') return 'zoom'
  const lower = url.toLowerCase().trim()
  if (lower.includes('meet.google.com')) return 'meet'
  if (lower.includes('zoom.us') || lower.includes('zoom.com')) return 'zoom'
  if (lower.includes('teams.microsoft.com') || lower.includes('teams.live.com')) return 'teams'
  return 'other'
}

export default function EditSessionLinkModal({ open, onClose, session, onSuccess }) {
  const qc = useQueryClient()
  const inputId = useId()
  const [meetingLink, setMeetingLink] = useState('')
  const [meetingProvider, setMeetingProvider] = useState('zoom')
  const [applyToFuture, setApplyToFuture] = useState(true)

  // Reset when session changes or modal opens
  useEffect(() => {
    if (session) {
      const current = session.meetingLink || ''
      setMeetingLink(current)
      setMeetingProvider(session.meetingProvider || detectProvider(current))
      setApplyToFuture(true)
    }
  }, [session, open])

  // Fetch teacher saved links for quick picker
  const { data: savedLinks = [] } = useQuery({
    queryKey: ['teacher', 'links'],
    queryFn: () => api.get('/teachers/me/links').then((r) => r.data.data || []),
    enabled: open,
  })

  function handleUrlChange(val) {
    setMeetingLink(val)
    if (val.trim()) {
      setMeetingProvider(detectProvider(val))
    }
  }

  function handleSelectSaved(linkObj) {
    if (!linkObj) return
    setMeetingLink(linkObj.link)
    setMeetingProvider(linkObj.provider || detectProvider(linkObj.link))
  }

  function handleTestLink() {
    const trimmed = meetingLink.trim()
    if (!trimmed) {
      toast.error('يرجى كتابة أو لصق الرابط أولاً')
      return
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      toast.error('الرابط يجب أن يبدأ بـ https:// أو http://')
      return
    }
    window.open(trimmed, '_blank', 'noopener,noreferrer')
  }

  const updateMutation = useMutation({
    mutationFn: () => {
      const trimmed = meetingLink.trim()
      if (!trimmed) throw new Error('يرجى إدخال رابط الاجتماع')
      if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        throw new Error('الرابط يجب أن يبدأ بـ https:// أو http://')
      }
      return api.patch(`/sessions/${session._id}/meeting-link`, {
        meetingLink: trimmed,
        meetingProvider,
        applyToFuture,
      })
    },
    onSuccess: (res) => {
      const cascaded = res.data?.data?.updatedFutureCount || res.data?.data?.cascadedCount || 0
      if (cascaded > 0) {
        toast.success(`تم تحديث رابط الحصة وتعميمه على ${cascaded} حصة قادمة وجدول الطالب بنجاح!`, { duration: 4500 })
      } else {
        toast.success('تم تحديث رابط الحصة بنجاح')
      }
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'schedule-rules'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      onSuccess?.(res.data?.data)
      onClose()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'فشل تحديث رابط الحصة')
    },
  })

  if (!session) return null

  const studentName = session.studentId?.firstNameAr
    ? `${session.studentId.firstNameAr} ${session.studentId.lastNameAr || ''}`
    : 'الطالب'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تعديل رابط الحصة"
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="!bg-gray-100 !text-gray-700 hover:!bg-gray-200 !border-transparent"
          >
            إلغاء
          </Button>
          <Button
            variant="purple"
            onClick={() => updateMutation.mutate()}
            loading={updateMutation.isPending}
            disabled={!meetingLink.trim()}
          >
            <Check size={16} /> حفظ وتحديث الرابط
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-start" dir="rtl">
        {/* Session context banner */}
        <div className="rounded-xl p-3.5 bg-violet-50/70 border border-violet-100 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-none text-violet-700">
            <Video size={18} />
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <div className="font-bold text-gray-900 text-sm">{session.titleAr || 'حصة تعليمية'}</div>
            <div className="text-gray-600 mt-0.5">مع الطالب: <span className="font-semibold text-violet-700">{studentName}</span></div>
            <div className="text-gray-400 mt-0.5">
              {formatDateAr(session.scheduledAt)} • {formatTimeAr(session.scheduledAt)}
            </div>
          </div>
        </div>

        {/* Quick select saved links */}
        {savedLinks.length > 0 && (
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
              <Sparkles size={13} className="text-amber-500" />
              اختيار سريع من روابطك المسجلة:
            </label>
            <div className="flex flex-wrap gap-2">
              {savedLinks.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSaved(s)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 font-medium ${
                    meetingLink === s.link
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Video size={12} />
                  <span>{s.label || s.title || (s.provider === 'meet' ? 'Google Meet' : 'Zoom')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Link Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor={inputId} className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Link2 size={14} className="text-violet-600" />
              رابط الاجتماع الجديد *
            </label>
            {meetingLink.trim() && (
              <button
                type="button"
                onClick={handleTestLink}
                className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 transition-colors"
              >
                <ExternalLink size={12} /> اختبار الرابط
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id={inputId}
              type="url"
              dir="ltr"
              placeholder="https://meet.google.com/... أو https://zoom.us/j/..."
              value={meetingLink}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 focus:bg-white transition-all text-left font-mono"
            />
          </div>
          {meetingLink.trim() && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
              <span>المنصة المكتشفة:</span>
              <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                {MEETING_PROVIDERS[meetingProvider]?.label || meetingProvider}
              </span>
            </div>
          )}
        </div>

        {/* Apply to Future checkbox */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={applyToFuture}
            onChange={(e) => setApplyToFuture(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-bold text-gray-800 block mb-0.5">
              تعميم هذا الرابط على جدول هذا الطالب وجميع حصصه القادمة
            </span>
            <span className="text-gray-500 text-[11px] leading-relaxed">
              عند التحديد، سيتم تحديث رابط هذه الحصة وجميع الحصص المستقبلية المجدولة مع ({studentName}) وقاعدته الدورية تلقائياً، وإشعار الطالب بالتعديل.
            </span>
          </div>
        </label>
      </div>
    </Modal>
  )
}
