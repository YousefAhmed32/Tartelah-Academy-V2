import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BookOpen, Star, Clock, Check, AlertCircle, ExternalLink, Calendar,
  User, CheckCircle2, History, AlertTriangle, ShieldAlert, HeartHandshake
} from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import Avatar from '../ui/Avatar.jsx'
import Spinner from '../ui/Spinner.jsx'
import { formatDateAr, formatDateTimeAr } from '../../utils/date.js'
import { getFileUrl } from '../../config/constants.js'
import { quranReportService } from '../../services/quranReport.service.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

const STATUS_CONFIG = {
  draft: { label: 'مسودة', variant: 'gray' },
  submitted: { label: 'بانتظار المراجعة', variant: 'warning' },
  correction_requested: { label: 'مطلوب تصحيح', variant: 'danger' },
  approved: { label: 'معتمد', variant: 'success' },
}

export default function QuranReportDetailModal({
  open,
  onClose,
  report: initialReport,
  onStatusChanged,
}) {
  const qc = useQueryClient()
  const [correctionMode, setCorrectionMode] = useState(false)
  const [correctionReason, setCorrectionReason] = useState('')

  const sessionId = initialReport?.sessionId?._id || initialReport?.sessionId

  // Fetch full detail if sessionId available
  const { data: detailData, isLoading } = useQuery({
    queryKey: ['quranReport', 'detail', sessionId],
    queryFn: () => quranReportService.getSessionReport(sessionId).then(r => r.data.data),
    enabled: open && !!sessionId,
  })

  const report = detailData?.report || initialReport
  const session = detailData?.session || initialReport?.sessionId
  const memorization = detailData?.memorization || []
  const revision = detailData?.revision || []
  const student = report?.studentId
  const teacher = report?.teacherId
  const evalData = report?.evaluationId

  // Approve Mutation
  const approveMut = useMutation({
    mutationFn: () => quranReportService.approveReport(report._id),
    onSuccess: () => {
      toast.success('تم اعتماد التقرير القرآني بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'quran-reports'] })
      qc.invalidateQueries({ queryKey: ['admin', 'student'] })
      qc.invalidateQueries({ queryKey: ['quranReport', 'detail', sessionId] })
      onStatusChanged?.('approved')
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ أثناء الاعتماد'),
  })

  // Correction Request Mutation
  const correctionMut = useMutation({
    mutationFn: () => quranReportService.requestCorrection(report._id, correctionReason),
    onSuccess: () => {
      toast.success('تم إرسال طلب تصحيح التقرير إلى المعلم')
      qc.invalidateQueries({ queryKey: ['admin', 'quran-reports'] })
      qc.invalidateQueries({ queryKey: ['admin', 'student'] })
      qc.invalidateQueries({ queryKey: ['quranReport', 'detail', sessionId] })
      onStatusChanged?.('correction_requested')
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ أثناء إرسال طلب التصحيح'),
  })

  if (!open || !report) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تفاصيل تقرير الحلقة القرآنية"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose}>
            إغلاق
          </Button>
          {report.status === 'submitted' && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCorrectionMode(!correctionMode)}
              >
                {correctionMode ? 'إلغاء التصحيح' : 'طلب تصحيح من المعلم'}
              </Button>
              <Button
                variant="purple"
                icon={<Check size={14} />}
                loading={approveMut.isPending}
                onClick={() => approveMut.mutate()}
              >
                اعتماد التقرير
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div dir="rtl" className="space-y-4">
        {/* Header summary card */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={getFileUrl(student?.avatar)}
              firstName={student?.firstNameAr}
              lastName={student?.lastNameAr}
              size="md"
            />
            <div>
              <div className="font-heading font-extrabold text-gray-900 text-sm">
                طالب: {student?.firstNameAr} {student?.lastNameAr}
              </div>
              <div className="text-xs text-gray-500">
                معلم: {teacher?.firstNameAr} {teacher?.lastNameAr}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar size={13} className="text-gray-400" />
              {formatDateTimeAr(session?.scheduledAt || report.createdAt)}
            </div>
            <Badge variant={STATUS_CONFIG[report.status]?.variant || 'gray'}>
              {STATUS_CONFIG[report.status]?.label || report.status}
            </Badge>
          </div>
        </div>

        {/* Correction form if expanded */}
        {correctionMode && (
          <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-red-800 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-red-600" />
              تحديد سبب وملاحظات طلب التصحيح للمعلم
            </div>
            <textarea
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="اكتب النقاط المطلوب من المعلم تصحيحها في التقرير..."
              className={`${inputCls} h-20 py-2 resize-none`}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCorrectionMode(false)}
              >
                تراجع
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={correctionMut.isPending}
                disabled={!correctionReason.trim()}
                onClick={() => correctionMut.mutate()}
              >
                إرسال طلب التصحيح
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Spinner color="border-violet-600" />
          </div>
        ) : (
          <>
            {/* 📖 أولاً: إنجاز الحلقة */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
              <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
                <BookOpen size={16} className="text-violet-600" />
                <span>📖 أولًا: إنجاز الحلقة</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-violet-700">ما تم تسميعه في حلقة اليوم:</div>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-line font-medium">
                    {report.todayRecitation || (memorization.length > 0 ? memorization.map(m => `سورة ${m.surahName || m.surahNumber} (آية ${m.ayahFrom || 1}-${m.ayahTo || ''})`).join('، ') : '—')}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-blue-700">ما تم مراجعته:</div>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-line font-medium">
                    {report.todayRevision || (revision.length > 0 ? revision.map(r => `سورة ${r.surahName || r.surahNumber}`).join('، ') : '—')}
                  </div>
                </div>
              </div>
            </div>

            {/* 🎯 ثانياً: الإنجاز المطلوب للحلقة القادمة */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
              <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
                <HeartHandshake size={16} className="text-blue-600" />
                <span>🎯 ثانيًا: الإنجاز المطلوب للحلقة القادمة</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-gray-500">التسميع المطلوب:</div>
                  <div className="text-gray-800 font-semibold">{report.nextRecitation || report.nextSessionHomework || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-gray-500">المراجعة المطلوبة:</div>
                  <div className="text-gray-800 font-semibold">{report.nextRevision || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-gray-500">الآداب / الأحاديث:</div>
                  <div className="text-gray-800 font-semibold">{report.nextManners || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-gray-500">التجويد:</div>
                  <div className="text-gray-800 font-semibold">{report.nextTajweed || report.tajweedNotes || '—'}</div>
                </div>
              </div>

              {/* رابط المصحف */}
              {(report.quranLink || report.referenceLink) && (
                <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-violet-950 flex items-center gap-1.5">
                    <ExternalLink size={14} className="text-violet-600" />
                    <span>🔗 رابط المصحف أو المرجع:</span>
                  </span>
                  <a
                    href={report.quranLink || report.referenceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-700 font-bold hover:underline"
                  >
                    فتح الرابط المقترح ←
                  </a>
                </div>
              )}
            </div>

            {/* ⭐ ثالثاً: تقييم المعلم للطالب */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
              <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
                <Star size={16} className="text-amber-600" />
                <span>⭐ ثالثًا: تقييم المعلم للطالب</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'الحفظ والتسميع', val: report.memorizationLevel },
                  { label: 'المراجعة', val: report.revisionLevel },
                  { label: 'التجويد والتلاوة', val: report.tajweedLevel },
                  { label: 'الالتزام والتفاعل', val: report.engagementLevel },
                ].map((item, idx) => {
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
                  const badge = map[item.val] || { label: item.val || '—', cls: 'bg-gray-50 text-gray-700 border-gray-200' }
                  return (
                    <div key={idx} className="p-3 bg-gray-50/80 rounded-xl text-center space-y-1">
                      <div className="text-[11px] text-gray-500 font-semibold">{item.label}</div>
                      <div className={`text-xs font-bold py-1 px-2 rounded-lg border ${badge.cls}`}>
                        {badge.label}
                      </div>
                    </div>
                  )
                })}
              </div>

              {(report.generalEvaluation || report.teacherNotes) && (
                <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-amber-900">التقييم العام وملاحظات المعلم:</div>
                  <div className="text-gray-800 leading-relaxed font-medium">
                    {report.generalEvaluation || report.teacherNotes}
                  </div>
                </div>
              )}
            </div>

            {/* 👨‍👩‍👧 رابعاً: ملاحظات لولي الأمر والتنبيهات */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
              <h3 className="font-heading font-bold text-sm text-gray-900 flex items-center gap-2">
                <User size={16} className="text-emerald-700" />
                <span>👨‍👩‍👧 رابعًا: ملاحظات وتنبيهات لولي الأمر</span>
              </h3>

              {report.parentNotes && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-emerald-800">ملاحظات موجهة لولي الأمر:</div>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-line font-medium">
                    {report.parentNotes}
                  </div>
                </div>
              )}

              {report.importantAlert && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-amber-600" />
                    <span>📌 تنبيه خاص:</span>
                  </div>
                  <div className="text-amber-950 font-bold leading-relaxed">
                    {report.importantAlert}
                  </div>
                </div>
              )}

              {!report.parentNotes && !report.importantAlert && (
                <p className="text-xs text-gray-400">لا توجد ملاحظات إضافية لولي الأمر</p>
              )}
            </div>

            {/* Transition history */}
            {report.history?.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs font-bold text-gray-400 mb-2">سجل التغييرات والاعتماد:</div>
                <div className="space-y-1 text-[11px] text-gray-500">
                  {report.history.map((h, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span>إجراء: {h.action === 'created' ? 'إنشاء' : h.action === 'submitted' ? 'إرسال' : h.action === 'correction_requested' ? 'طلب تصحيح' : h.action === 'approved' ? 'اعتماد' : h.action}</span>
                      <span>{formatDateTimeAr(h.at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
