import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  FileBarChart, Check, AlertCircle, Sparkles, Calendar, DollarSign,
  TrendingUp, Users, Clock, AlertTriangle, MessageSquare
} from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Badge from '../ui/Badge.jsx'
import Avatar from '../ui/Avatar.jsx'
import { formatCurrency } from '../../utils/format.js'
import { formatDateTimeAr } from '../../utils/date.js'
import { getFileUrl } from '../../config/constants.js'
import { monthlyReportService } from '../../services/monthlyReport.service.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

const STATUS_CONFIG = {
  draft: { label: 'مسودة', variant: 'gray' },
  submitted: { label: 'بانتظار المراجعة', variant: 'warning' },
  needs_completion: { label: 'يحتاج إكمال', variant: 'danger' },
  reviewed: { label: 'تمت المراجعة', variant: 'blue' },
  approved: { label: 'معتمد', variant: 'success' },
}

export default function MonthlyReportDetailModal({
  open,
  onClose,
  report,
}) {
  const qc = useQueryClient()
  const [completionMode, setCompletionMode] = useState(false)
  const [completionNote, setCompletionNote] = useState('')

  const teacher = report?.teacherId

  const reviewMut = useMutation({
    mutationFn: () => monthlyReportService.markReviewed(report._id),
    onSuccess: () => {
      toast.success('تم تعليم التقرير كمُراجَع')
      qc.invalidateQueries({ queryKey: ['admin', 'monthly-reports'] })
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const approveMut = useMutation({
    mutationFn: () => monthlyReportService.approveReport(report._id),
    onSuccess: () => {
      toast.success('تم اعتماد التقرير الشهري بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'monthly-reports'] })
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const completionMut = useMutation({
    mutationFn: () => monthlyReportService.requestCompletion(report._id, completionNote),
    onSuccess: () => {
      toast.success('تم إرسال طلب استكمال التقرير للمعلم')
      qc.invalidateQueries({ queryKey: ['admin', 'monthly-reports'] })
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  if (!open || !report) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`التقرير الشهري الشامل: ${report.periodKey}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose}>
            إغلاق
          </Button>
          <div className="flex items-center gap-2">
            {report.status === 'submitted' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCompletionMode(!completionMode)}
                >
                  {completionMode ? 'إلغاء الطلب' : 'طلب استكمال'}
                </Button>
                <Button
                  variant="outline"
                  loading={reviewMut.isPending}
                  onClick={() => reviewMut.mutate()}
                >
                  تمت المراجعة
                </Button>
              </>
            )}
            {(report.status === 'submitted' || report.status === 'reviewed') && (
              <Button
                variant="purple"
                icon={<Check size={14} />}
                loading={approveMut.isPending}
                onClick={() => approveMut.mutate()}
              >
                اعتماد التقرير
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div dir="rtl" className="space-y-5">
        {/* Header teacher bar */}
        <div className="bg-violet-50/80 border border-violet-100 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={getFileUrl(teacher?.avatar)}
              firstName={teacher?.firstNameAr}
              lastName={teacher?.lastNameAr}
              size="md"
            />
            <div>
              <div className="font-heading font-extrabold text-gray-900 text-sm">
                المعلم: {teacher?.firstNameAr} {teacher?.lastNameAr}
              </div>
              <div className="text-xs text-gray-500">الفترة: {report.periodKey}</div>
            </div>
          </div>
          <Badge variant={STATUS_CONFIG[report.status]?.variant || 'gray'}>
            {STATUS_CONFIG[report.status]?.label || report.status}
          </Badge>
        </div>

        {/* Completion request form */}
        {completionMode && (
          <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold text-red-800 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-red-600" />
              ما المطلوب استكماله من المعلم؟
            </div>
            <textarea
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="اكتب النقاط المطلوب استكمالها بدقة..."
              className={`${inputCls} h-20 py-2 resize-none`}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCompletionMode(false)}>
                تراجع
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={completionMut.isPending}
                disabled={!completionNote.trim()}
                onClick={() => completionMut.mutate()}
              >
                إرسال طلب الاستكمال
              </Button>
            </div>
          </div>
        )}

        {/* Sessions Statistics Grid */}
        <div>
          <div className="text-xs font-bold text-gray-500 mb-2">إحصائيات الحصص خلال الشهر</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <div className="text-lg font-extrabold text-gray-900">{report.scheduledSessions}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">المجدولة</div>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <div className="text-lg font-extrabold text-gray-900">{report.conductedSessions}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">المنفذة</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <div className="text-lg font-extrabold text-emerald-700">{report.completedSessions}</div>
              <div className="text-[11px] text-emerald-600 mt-0.5">المكتملة</div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <div className="text-lg font-extrabold text-red-600">{report.cancelledSessions}</div>
              <div className="text-[11px] text-red-500 mt-0.5">الملغاة</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
              <div className="text-lg font-extrabold text-amber-700">{report.postponedSessions}</div>
              <div className="text-[11px] text-amber-600 mt-0.5">المؤجلة</div>
            </div>
          </div>
        </div>

        {/* Reports & Attendance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="font-heading font-bold text-xs text-gray-700 flex items-center gap-1.5">
              <FileBarChart size={15} className="text-violet-600" /> تقارير الحلقات القرآنية
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-gray-50">
              <span className="text-gray-500">تقارير مكتملة ومرفوعة</span>
              <span className="font-bold text-emerald-600">{report.submittedReports}</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-gray-50">
              <span className="text-gray-500">تقارير متأخرة أو ناقصة</span>
              <span className={`font-bold ${report.missingReports > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {report.missingReports}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-gray-500">إجمالي الطلاب المسندين</span>
              <span className="font-bold text-gray-800">{report.assignedStudentsCount} طالب</span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
            <div className="font-heading font-bold text-xs text-gray-700 flex items-center gap-1.5">
              <Clock size={15} className="text-blue-600" /> مؤشرات الالتزام والحضور
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-gray-50">
              <span className="text-gray-500">نسبة إنجاز الحصص</span>
              <span className="font-bold text-emerald-600">{report.attendanceSummary?.completionRate || 0}%</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-gray-50">
              <span className="text-gray-500">نسبة الانضباط الزمني (في الموعد)</span>
              <span className="font-bold text-blue-600">{report.attendanceSummary?.punctualityRate || 0}%</span>
            </div>
            <div className="flex justify-between text-xs py-1 text-gray-500">
              <span>(في الموعد: {report.attendanceSummary?.onTime || 0} · متأخر: {report.attendanceSummary?.late || 0} · غياب: {report.attendanceSummary?.absent || 0})</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gradient-to-br from-gray-50 to-slate-100 border border-gray-200/80 rounded-2xl p-4">
          <div className="font-heading font-bold text-xs text-gray-700 mb-3 flex items-center gap-1.5">
            <DollarSign size={15} className="text-emerald-600" /> ملخص المستحقات المالية للشهر
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="text-gray-500">المستحق الأساسي</div>
              <div className="font-bold text-gray-900 mt-1">{formatCurrency(report.grossEntitlement, report.currency)}</div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="text-gray-500">مكافآت وحوافز</div>
              <div className="font-bold text-emerald-600 mt-1">+{formatCurrency(report.bonusesTotal, report.currency)}</div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <div className="text-gray-500">خصومات وجزاءات</div>
              <div className="font-bold text-red-600 mt-1">-{formatCurrency(report.deductionsTotal, report.currency)}</div>
            </div>
            <div className="bg-emerald-600 text-white rounded-xl p-3">
              <div className="text-emerald-100 font-semibold">صافي المستحق</div>
              <div className="font-extrabold text-base mt-1">{formatCurrency(report.netPayable, report.currency)}</div>
            </div>
          </div>
        </div>

        {/* Narrative & Notes */}
        <div className="space-y-3">
          {report.teacherNotes && (
            <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-gray-700">ملاحظات المعلم حول الشهر:</div>
              <p className="text-gray-600 leading-relaxed">{report.teacherNotes}</p>
            </div>
          )}
          {report.challenges && (
            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-amber-800">التحديات والمعوقات المرصودة:</div>
              <p className="text-amber-900 leading-relaxed">{report.challenges}</p>
            </div>
          )}
          {report.recommendations && (
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-blue-800">التوصيات المقترحة:</div>
              <p className="text-blue-900 leading-relaxed">{report.recommendations}</p>
            </div>
          )}
          {report.adminNotes && (
            <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3 text-xs space-y-1">
              <div className="font-bold text-purple-800">ملاحظات الإدارة الداخلية:</div>
              <p className="text-purple-900 leading-relaxed">{report.adminNotes}</p>
            </div>
          )}
        </div>

        {/* Transition history */}
        {report.history?.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs font-bold text-gray-400 mb-2">سجل الحالات:</div>
            <div className="space-y-1 text-[11px] text-gray-500">
              {report.history.map((h, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span>{h.action} {h.note ? `(${h.note})` : ''}</span>
                  <span>{formatDateTimeAr(h.at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
