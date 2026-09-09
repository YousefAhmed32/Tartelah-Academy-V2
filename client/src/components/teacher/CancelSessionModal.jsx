import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, Check, X } from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'

export default function CancelSessionModal({ open, onClose, session, onSuccess }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const trimmed = reason.trim()
      if (!trimmed) throw new Error('يرجى كتابة سبب الإلغاء')
      return api.patch(`/sessions/${session._id}/cancel`, { reason: trimmed })
    },
    onSuccess: (res) => {
      toast.success('تم إلغاء الحصة وإشعار الطالب')
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      onSuccess?.(res.data?.data)
      onClose()
    },
    onError: (e) => toast.error(e?.response?.data?.message || e.message || 'فشل إلغاء الحصة'),
  })

  if (!session) return null

  const studentName = session.studentId?.firstNameAr
    ? `${session.studentId.firstNameAr} ${session.studentId.lastNameAr || ''}`
    : 'الطالب'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إلغاء الحصة المجدولة"
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
            className="!bg-gray-100 !text-gray-700 hover:!bg-gray-200 !border-transparent"
          >
            تراجع
          </Button>
          <Button
            variant="danger"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!reason.trim()}
          >
            تأكيد إلغاء الحصة
          </Button>
        </>
      }
    >
      <div className="space-y-3.5 text-start" dir="rtl">
        <div className="rounded-xl p-3 bg-rose-50 border border-rose-100 text-xs text-rose-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle size={15} className="text-rose-600" />
            <span>تنبيه بشأن الإلغاء</span>
          </div>
          <p className="text-rose-700 leading-relaxed">
            أنت على وشك إلغاء الحصة المقررة مع الطالب <span className="font-bold">{studentName}</span> بتاريخ {formatDateAr(session.scheduledAt)} ({formatTimeAr(session.scheduledAt)}).
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">
            سبب الإلغاء (سيظهر لإدارة المنصة والطالب) *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: عذر طارئ للمعلم / ظرف تقني / تم الاتفاق مع الطالب على موعد بديل..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 focus:bg-white resize-none transition-all"
          />
        </div>
      </div>
    </Modal>
  )
}
