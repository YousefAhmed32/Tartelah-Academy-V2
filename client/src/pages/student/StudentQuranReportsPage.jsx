import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BookOpen, Star, Calendar, ExternalLink, HeartHandshake,
  User, ShieldAlert, CheckCircle2, Copy, Check, Share2
} from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { quranReportService } from '../../services/quranReport.service.js'
import { getFileUrl } from '../../config/constants.js'

function LevelBadge({ label, val }) {
  if (!val) return null
  const map = {
    excellent: { label: 'ممتاز', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'ممتاز': { label: 'ممتاز', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    very_good: { label: 'جيد جدًا', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    'جيد جدًا': { label: 'جيد جدًا', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    good: { label: 'جيد', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    'جيد': { label: 'جيد', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    needs_followup: { label: 'يحتاج متابعة', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    'يحتاج متابعة': { label: 'يحتاج متابعة', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  }
  const badge = map[val] || { label: val, cls: 'bg-gray-100 text-gray-700 border-gray-200' }
  return (
    <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 text-center space-y-1 shadow-2xs">
      <div className="text-[11px] text-gray-500 font-medium">{label}</div>
      <div className={`text-xs font-bold py-1 px-2 rounded-lg border ${badge.cls}`}>
        {badge.label}
      </div>
    </div>
  )
}

export default function StudentQuranReportsPage() {
  const [copiedId, setCopiedId] = useState(null)
  const { data, isLoading } = useQuery({
    queryKey: ['student', 'quran-reports'],
    queryFn: () => quranReportService.getMyStudentReports({ limit: 30 }).then(r => r.data.data),
  })
  const reports = data?.reports || []

  const copyReportSummary = (r) => {
    const lines = [
      '📋 *تقرير الحلقة – ترتيلة online*',
      `📅 التاريخ: ${formatDateAr(r.sessionId?.scheduledAt || r.createdAt)}`,
      `👤 المعلم: ${r.teacherId?.firstNameAr || ''} ${r.teacherId?.lastNameAr || ''}`,
      '',
      '📖 *أولًا: إنجاز حلقة اليوم*',
      `• ما تم تسميعه: ${r.todayRecitation || '—'}`,
      `• ما تم مراجعته: ${r.todayRevision || '—'}`,
      '',
      '🎯 *ثانيًا: المطلوب للحلقة القادمة*',
      `• التسميع: ${r.nextRecitation || '—'}`,
      `• المراجعة: ${r.nextRevision || '—'}`,
      r.nextManners ? `• الآداب/الأحاديث: ${r.nextManners}` : null,
      r.nextTajweed ? `• التجويد: ${r.nextTajweed}` : null,
      r.quranLink ? `• رابط المصحف: ${r.quranLink}` : null,
      '',
      '⭐ *ثالثًا: تقييم المعلم*',
      `• الحفظ والتسميع: ${r.memorizationLevel || '—'}`,
      `• المراجعة: ${r.revisionLevel || '—'}`,
      `• التجويد والتلاوة: ${r.tajweedLevel || '—'}`,
      `• الالتزام والتفاعل: ${r.engagementLevel || '—'}`,
      r.generalEvaluation ? `• ملاحظات عامة: ${r.generalEvaluation}` : null,
      '',
      (r.parentNotes || r.importantAlert) ? '📌 *ملاحظات لولي الأمر:*' : null,
      r.parentNotes ? `• ${r.parentNotes}` : null,
      r.importantAlert ? `• تنبيه: ${r.importantAlert}` : null,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(lines).then(() => {
      setCopiedId(r._id)
      toast.success('تم نسخ تقرير الحلقة بنجاح للمشاركة عبر الواتساب')
      setTimeout(() => setCopiedId(null), 2500)
    }).catch(() => {
      toast.error('تعذر النسخ إلى الحافظة')
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner color="border-violet-600" />
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="تقارير حلقاتي القرآنية"
        subtitle="متابعة إنجازك القرآني وتوجيهات معلمك ومهام اللقاءات القادمة"
      />

      {!reports.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h3 className="font-heading font-bold text-gray-800 text-base mb-1">لا توجد تقارير بعد</h3>
          <p className="text-gray-400 text-xs">ستظهر تقارير الحلقات فور اعتمادها من قِبل إدارة الأكاديمية</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((r) => {
            const teacher = r.teacherId
            const session = r.sessionId
            const isCopied = copiedId === r._id
            return (
              <div
                key={r._id}
                className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all space-y-5"
              >
                {/* Header: Teacher & Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={getFileUrl(teacher?.avatar)}
                      firstName={teacher?.firstNameAr}
                      lastName={teacher?.lastNameAr}
                      size="md"
                      className="ring-2 ring-violet-50"
                    />
                    <div>
                      <div className="font-heading font-bold text-gray-900 text-sm sm:text-base">
                        المعلم: {teacher?.firstNameAr} {teacher?.lastNameAr}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateAr(session?.scheduledAt || r.createdAt)}</span>
                        {session?.scheduledAt && (
                          <>
                            <span>•</span>
                            <span>{formatTimeAr(session.scheduledAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => copyReportSummary(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-violet-50 text-gray-700 hover:text-violet-700 border border-gray-200 hover:border-violet-200 text-xs font-bold transition-all"
                      title="نسخ تقرير الحلقة بنص منسق للمشاركة عبر الواتساب"
                    >
                      {isCopied ? <Check size={13} className="text-emerald-600" /> : <Share2 size={13} />}
                      <span>{isCopied ? 'تم النسخ ✓' : 'مشاركة التقرير'}</span>
                    </button>
                    <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                      تقرير معتمد ✓
                    </span>
                  </div>
                </div>

                {/* 1. إنجاز الحلقة */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-violet-700">
                    <BookOpen className="w-4 h-4" />
                    <span>📖 أولًا: إنجاز الحلقة</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-violet-50/40 border border-violet-100/70 space-y-1">
                      <div className="font-bold text-gray-500 text-[11px]">ما تم تسميعه في حلقة اليوم:</div>
                      <div className="text-gray-900 font-semibold leading-relaxed whitespace-pre-line">
                        {r.todayRecitation || r.nextSessionHomework || '—'}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-100/70 space-y-1">
                      <div className="font-bold text-gray-500 text-[11px]">ما تم مراجعته:</div>
                      <div className="text-gray-900 font-semibold leading-relaxed whitespace-pre-line">
                        {r.todayRevision || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. المطلوب للحلقة القادمة */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                    <HeartHandshake className="w-4 h-4" />
                    <span>🎯 ثانيًا: الإنجاز المطلوب للحلقة القادمة (الواجب)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                      <div className="font-bold text-gray-500 text-[11px]">التسميع:</div>
                      <div className="text-gray-900 font-medium">{r.nextRecitation || r.nextSessionHomework || '—'}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                      <div className="font-bold text-gray-500 text-[11px]">المراجعة:</div>
                      <div className="text-gray-900 font-medium">{r.nextRevision || '—'}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                      <div className="font-bold text-gray-500 text-[11px]">الآداب / الأحاديث:</div>
                      <div className="text-gray-900 font-medium">{r.nextManners || '—'}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                      <div className="font-bold text-gray-500 text-[11px]">التجويد:</div>
                      <div className="text-gray-900 font-medium">{r.nextTajweed || r.tajweedNotes || '—'}</div>
                    </div>
                  </div>

                  {(r.quranLink || r.referenceLink) && (
                    <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-violet-900">🔗 رابط المصحف أو المرجع المقترح:</span>
                      <a
                        href={r.quranLink || r.referenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-violet-700 hover:underline flex items-center gap-1"
                      >
                        فتح المصحف <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* 3. تقييم المعلم */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                    <Star className="w-4 h-4" />
                    <span>⭐ ثالثًا: تقييم المعلم</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <LevelBadge label="الحفظ والتسميع" val={r.memorizationLevel} />
                    <LevelBadge label="المراجعة" val={r.revisionLevel} />
                    <LevelBadge label="التجويد والتلاوة" val={r.tajweedLevel} />
                    <LevelBadge label="الالتزام والتفاعل" val={r.engagementLevel} />
                  </div>

                  {(r.generalEvaluation || r.teacherNotes) && (
                    <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/50 text-xs">
                      <span className="font-bold text-amber-900 block mb-1">التقييم العام:</span>
                      <p className="text-gray-800 leading-relaxed font-medium">
                        {r.generalEvaluation || r.teacherNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* 4. ملاحظات لولي الأمر والتنبيهات */}
                {(r.parentNotes || r.importantAlert) && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                      <User className="w-4 h-4" />
                      <span>👨‍👩‍👧 رابعًا: ملاحظات وتنبيهات لولي الأمر</span>
                    </div>

                    {r.parentNotes && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                        <span className="font-bold text-emerald-800 block mb-1">ملاحظات لولي الأمر:</span>
                        <p className="text-gray-800 leading-relaxed whitespace-pre-line font-medium">
                          {r.parentNotes}
                        </p>
                      </div>
                    )}

                    {r.importantAlert && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/70 text-xs flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600 flex-none mt-0.5" />
                        <div>
                          <span className="font-bold text-amber-900 block mb-0.5">📌 تنبيه:</span>
                          <p className="text-amber-950 font-bold leading-relaxed">{r.importantAlert}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
