import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { DAYS_OF_WEEK, SCHEDULE_FREQUENCY } from '../../config/constants.js'

const STATUS_CONFIG = {
  active: { label: 'نشط', badge: 'success' },
  paused: { label: 'موقوف', badge: 'warning' },
  ended: { label: 'منتهٍ', badge: 'gray' },
}

const FIELD = 'field-light w-full'

export default function EditScheduleRuleModal({ rule, teachers: propTeachers, students: propStudents, onClose, onSuccess }) {
  const qc = useQueryClient()

  const { data: fetchedTeachers = [] } = useQuery({
    queryKey: ['admin', 'teachers', 'combobox'],
    queryFn: () => api.get('/admin/teachers', { params: { limit: 100 } }).then((r) => r.data.data?.teachers || r.data.data?.rows || r.data.data || []),
    enabled: !propTeachers || propTeachers.length === 0,
  })

  const { data: fetchedStudents = [] } = useQuery({
    queryKey: ['admin', 'students', 'combobox'],
    queryFn: () => api.get('/admin/students', { params: { limit: 100 } }).then((r) => r.data.data?.students || r.data.data?.rows || r.data.data || []),
    enabled: !propStudents || propStudents.length === 0,
  })

  const teachers = propTeachers && propTeachers.length > 0 ? propTeachers : fetchedTeachers
  const students = propStudents && propStudents.length > 0 ? propStudents : fetchedStudents

  const [form, setForm] = useState({
    status: rule.status,
    meetingLink: rule.meetingLink || '',
    endDate: rule.endDate ? rule.endDate.slice(0, 10) : '',
    notes: rule.notes || '',
    frequency: rule.frequency || 'weekly',
    daysOfWeek: rule.daysOfWeek || [],
    timeOfDay: rule.timeOfDay || '18:00',
    durationMinutes: rule.durationMinutes || 60,
    teacherId: rule.teacherId?._id || rule.teacherId || '',
    studentId: rule.studentId?._id || rule.studentId || '',
  })

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const toggleDay = (d) => setForm((p) => ({
    ...p,
    daysOfWeek: p.daysOfWeek.includes(d) ? p.daysOfWeek.filter((x) => x !== d) : [...p.daysOfWeek, d].sort(),
  }))

  const mut = useMutation({
    mutationFn: (data) => api.patch(`/admin/schedule-rules/${rule._id}`, data).then((r) => r.data),
    onSuccess: () => {
      toast.success('تم تحديث موعد الجدول الدوري بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'schedule-rules'] })
      qc.invalidateQueries({ queryKey: ['admin', 'student', 'schedule-rules'] })
      qc.invalidateQueries({ queryKey: ['admin', 'student', rule.studentId?._id || rule.studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics'] })
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'حدث خطأ أثناء تحديث الجدول'),
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="تعديل الجدول الدوري للحصص"
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={onClose} disabled={mut.isPending}>
            إلغاء
          </Button>
          <Button variant="purple" onClick={() => mut.mutate(form)} loading={mut.isPending}>
            حفظ التعديلات
          </Button>
        </div>
      }
    >
      <div className="space-y-4" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">المعلم</label>
            <select value={form.teacherId} onChange={(e) => set('teacherId', e.target.value)} className={FIELD}>
              <option value="">اختر المعلم...</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.firstNameAr} {t.lastNameAr}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">الطالب</label>
            <select value={form.studentId} onChange={(e) => set('studentId', e.target.value)} className={FIELD}>
              <option value="">اختر الطالب...</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.firstNameAr} {s.lastNameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">الحالة</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={FIELD}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">التكرار</label>
            <select value={form.frequency} onChange={(e) => set('frequency', e.target.value)} className={FIELD}>
              {Object.entries(SCHEDULE_FREQUENCY).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">مدة الحصة (دقيقة)</label>
            <input
              type="number"
              min={15}
              step={15}
              value={form.durationMinutes}
              onChange={(e) => set('durationMinutes', Number(e.target.value))}
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">أيام الأسبوع</label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={
                  form.daysOfWeek.includes(d.value)
                    ? { background: 'rgba(124,58,237,0.15)', color: '#7c3aed', border: '1.5px solid #7c3aed' }
                    : { background: '#f9fafb', color: '#9ca3af', border: '1.5px solid transparent' }
                }
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">وقت الحصة</label>
            <input
              type="time"
              value={form.timeOfDay}
              onChange={(e) => set('timeOfDay', e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">تاريخ الانتهاء (اختياري)</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">رابط الاجتماع (Zoom / Meet)</label>
          <input
            type="url"
            value={form.meetingLink}
            onChange={(e) => set('meetingLink', e.target.value)}
            className={FIELD}
            placeholder="https://zoom.us/j/..."
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات إدارية</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            className={`${FIELD} h-16 resize-none py-2`}
            placeholder="ملاحظات حول هذا الجدول..."
          />
        </div>
      </div>
    </Modal>
  )
}
