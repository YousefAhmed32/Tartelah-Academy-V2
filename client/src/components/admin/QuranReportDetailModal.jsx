import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BookOpen, Star, Clock, Check, AlertCircle, Sparkles, ExternalLink, Calendar,
  User, CheckCircle2, History, AlertTriangle
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
            {/* Memorization (الحفظ الجديد) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-heading font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen size={16} className="text-violet-600" /> الحفظ الجديد في الحصة
              </h3>
              {memorization.length === 0 ? (
                <p className="text-xs text-gray-400">لا يوجد حفظ جديد مسجل في هذه الحصة</p>
              ) : (
                <div className="space-y-2">
                  {memorization.map((m) => (
                    <div key={m._id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-800 text-sm">
                          {m.surahName || `سورة رقم ${m.surahNumber}`}
                        </span>
                        <div className="text-gray-500 mt-0.5">
                          {m.ayahFrom && m.ayahTo ? `من آية ${m.ayahFrom} إلى ${m.ayahTo}` : 'كامل السورة'}
                          {m.pages ? ` · ${m.pages} صفحة` : ''}
                        </div>
                      </div>
                      {m.grade && (
                        <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                          <Star size={13} fill="currentColor" /> {m.grade}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revision (المراجعة) */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <h3 className="font-heading font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                <History size={16} className="text-blue-600" /> المراجعة (الماضي القريب / البعيد)
              </h3>
              {revision.length === 0 ? (
                <p className="text-xs text-gray-400">لا توجد مراجعة مسجلة في هذه الحصة</p>
              ) : (
                <div className="space-y-2">
                  {revision.map((r) => (
                    <div key={r._id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-800 text-sm">
                          {r.surahName || `سورة رقم ${r.surahNumber}`}
                        </span>
                        {r.notes && <div className="text-gray-500 mt-0.5">{r.notes}</div>}
                      </div>
                      {r.grade && (
                        <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                          <Star size={13} fill="currentColor" /> {r.grade}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Observations & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.tajweedNotes && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-violet-700">ملاحظات التجويد ومخارج الحروف:</div>
                  <div className="text-gray-700 leading-relaxed">{report.tajweedNotes}</div>
                </div>
              )}
              {report.interactiveActivity && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-emerald-700">النشاط التفاعلي خلال الحصة:</div>
                  <div className="text-gray-700 leading-relaxed">{report.interactiveActivity}</div>
                </div>
              )}
              {report.nextSessionHomework && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-amber-700">مطلوب التحضير للحصة القادمة:</div>
                  <div className="text-gray-700 leading-relaxed">{report.nextSessionHomework}</div>
                </div>
              )}
              {report.teacherNotes && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-gray-700">ملاحظات المعلم العامة:</div>
                  <div className="text-gray-700 leading-relaxed">{report.teacherNotes}</div>
                </div>
              )}
            </div>

            {/* Reference link if any */}
            {report.referenceLink && (
              <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">رابط المصحف أو المرجع المقترح:</span>
                <a
                  href={report.referenceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-violet-600 font-bold hover:underline"
                >
                  <ExternalLink size={13} /> فتح الرابط
                </a>
              </div>
            )}

            {/* Evaluation grade */}
            {evalData?.score != null && (
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900">تقييم أداء الطالب في الحصة:</span>
                <span className="text-amber-700 font-extrabold text-sm flex items-center gap-1">
                  <Star size={14} fill="currentColor" /> {evalData.score} / 10
                </span>
              </div>
            )}

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
