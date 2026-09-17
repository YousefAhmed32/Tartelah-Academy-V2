import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CalendarClock, Check, AlertCircle } from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import AcademyTimezoneNotice from '../ui/AcademyTimezoneNotice.jsx'
import { formatDateAr, formatTimeAr, toAcademyDateTimeLocal } from '../../utils/date.js'

export default function RescheduleSessionModal({ open, onClose, session, onSuccess }) {
  const qc = useQueryClient()
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    if (session?.scheduledAt) {
      // Default to scheduled time formatted for datetime-local
      try {
        setNewDate(toAcademyDateTimeLocal(session.scheduledAt))
      } catch {
        setNewDate('')
      }
    }
  }, [session, open])

  const mutation = useMutation({
    mutationFn: () => {
      if (!newDate) throw new Error('يرجى تحديد الموعد الجديد')
      return api.patch(`/sessions/${session._id}/reschedule`, { newDate })
    },
    onSuccess: (res) => {
      toast.success('تمت إعادة جدولة الحصة بنجاح وإشعار الطالب')
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      onSuccess?.(res.data?.data)
      onClose()
    },
    onError: (e) => toast.error(e?.response?.data?.message || e.message || 'حدث خطأ في إعادة الجدولة'),
  })

  if (!session) return null

  const studentName = session.studentId?.firstNameAr
    ? `${session.studentId.firstNameAr} ${session.studentId.lastNameAr || ''}`
    : 'الطالب'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إعادة جدولة الحصة"
      size="sm"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
            className="!bg-gray-100 !text-gray-700 hover:!bg-gray-200 !border-transparent"
          >
            إلغاء
          </Button>
          <Button
            variant="purple"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!newDate}
          >
            <Check size={16} /> تأكيد الموعد الجديد
          </Button>
        </>
      }
    >
      <div className="space-y-3.5 text-start" dir="rtl">
        <AcademyTimezoneNotice compact />
        <div className="rounded-xl p-3 bg-amber-50/70 border border-amber-100 text-xs text-amber-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <CalendarClock size={15} className="text-amber-600" />
            <span>الموعد الحالي:</span>
          </div>
          <div className="font-semibold text-gray-800 text-sm">
            {formatDateAr(session.scheduledAt)} • {formatTimeAr(session.scheduledAt)}
          </div>
          <div className="text-gray-600">
            مع الطالب: <span className="font-bold text-violet-700">{studentName}</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">الموعد والتاريخ الجديد *</label>
          <input
            type="datetime-local"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 focus:bg-white transition-all font-sans"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            سيتم التحقق تلقائياً من عدم وجود تعارض في جدولك أو جدول الطالب.
          </p>
        </div>
      </div>
    </Modal>
  )
}
