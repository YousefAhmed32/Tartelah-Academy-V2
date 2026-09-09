import { CheckCircle2, Wallet, BadgeDollarSign, Star, FileText, BookOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { ATT_OPTIONS, PAYROLL_STATUS, ROUTES } from '../../config/constants.js'

const ROW = 'flex items-center justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0'

/**
 * Shown immediately after a session is finished — a concise, honest receipt
 * of every real effect the action just had, per the UX brief's "after
 * completion, display a concise receipt of: student attendance, lesson
 * outcome, balance effect, teacher-payroll effect, homework/evaluation/
 * report state." Never fabricates a number — every field comes straight
 * from the real /sessions/:id/finish response (session.controller.js).
 */
export default function FinishReceiptModal({ data, onClose }) {
  const navigate = useNavigate()
  if (!data) return null
  const { session, attendance, evaluation, homework, walletEffect } = data
  const attOption = ATT_OPTIONS.find((o) => o.value === attendance?.status)
  const payrollInfo = PAYROLL_STATUS[session?.payrollStatus] || PAYROLL_STATUS.pending

  return (
    <Modal open onClose={onClose} title="تم إنهاء الحصة" size="sm"
      footer={
        <div className="flex gap-2 w-full">
          <Button variant="ghost" className="flex-1 !bg-gray-100 !text-gray-600 hover:!bg-gray-200 !border-transparent"
            onClick={() => navigate(ROUTES.TEACHER_QURAN_REPORT.replace(':sessionId', session._id))}>
            <BookOpen size={14} strokeWidth={2} className="inline me-1.5" /> إضافة تقرير الحلقة
          </Button>
          <Button variant="purple" className="flex-1" onClick={onClose}>تم</Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-1">
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 mb-3">
          <CheckCircle2 size={18} className="text-emerald-600 flex-none" />
          <p className="text-xs font-semibold text-emerald-700">تم حفظ الحصة بنجاح — هذا ملخص ما تم تسجيله فعليًا.</p>
        </div>

        <div className={ROW}>
          <span className="text-xs font-semibold text-gray-500">حضور الطالب</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: attOption?.bg || '#f3f4f6', color: attOption?.color || '#6b7280' }}>
            {attOption?.label || attendance?.status || '—'}
          </span>
        </div>

        <div className={ROW}>
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><Wallet size={13} /> أثر الرصيد</span>
          <span className="text-xs font-bold text-gray-800">
            {walletEffect?.action === 'consumed' && `خُصمت حصة واحدة${walletEffect.balanceAfter != null ? ` — المتبقي ${walletEffect.balanceAfter}` : ''}`}
            {walletEffect?.action === 'released' && `أُرجعت حصة إلى الرصيد${walletEffect.balanceAfter != null ? ` — المتبقي ${walletEffect.balanceAfter}` : ''}`}
            {walletEffect?.action === 'none' && 'لا تغيير على الرصيد'}
          </span>
        </div>

        <div className={ROW}>
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><BadgeDollarSign size={13} /> حالة الأجر</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${payrollInfo.color}1a`, color: payrollInfo.color }}>
            {payrollInfo.label}
          </span>
        </div>

        <div className={ROW}>
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><Star size={13} /> التقييم</span>
          <span className="text-xs font-bold text-gray-800">{evaluation ? `تم إضافة تقييم (${evaluation.score}/١٠)` : 'لم يُضف'}</span>
        </div>

        <div className={ROW}>
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><FileText size={13} /> الواجب</span>
          <span className="text-xs font-bold text-gray-800">{homework ? 'تم تعيين واجب' : 'لم يُعيَّن'}</span>
        </div>

        <div className="pt-2.5">
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
            <BookOpen size={15} className="text-amber-600 flex-none" />
            <p className="text-[11px] font-semibold text-amber-700">لا يزال تقرير الحلقة (الحفظ/المراجعة) مطلوبًا لهذه الحصة.</p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
