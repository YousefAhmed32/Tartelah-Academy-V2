import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Star, FileText } from 'lucide-react'
import api from '../../utils/api.js'
import Avatar from '../ui/Avatar.jsx'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import { ATT_OPTIONS, getFileUrl } from '../../config/constants.js'

const FIELD = 'field-light w-full'
const LBL = 'block text-xs font-bold text-brand-textBody mb-1.5'

// The single place everything about wrapping up a session happens: student
// attendance (required), optional teacher notes, optional homework, optional
// evaluation — one save button, one backend call (/sessions/:id/finish).
// Shared by the Sessions page and the Home Dashboard's current-session card
// so the finish workflow is identical no matter where it's launched from.
export default function FinishSessionModal({ session, onClose, qc }) {
  const [attendanceStatus, setAttendanceStatus] = useState('')
  const [attendanceNotes, setAttendanceNotes] = useState('')
  const [teacherNotes, setTeacherNotes] = useState('')
  const [addHomework, setAddHomework] = useState(false)
  const [hwTitle, setHwTitle] = useState('')
  const [hwDesc, setHwDesc] = useState('')
  const [hwDue, setHwDue] = useState('')
  const [addEval, setAddEval] = useState(false)
  const [evalType, setEvalType] = useState('general')
  const [evalScore, setEvalScore] = useState(8)
  const [evalNotes, setEvalNotes] = useState('')

  const attOptions = ATT_OPTIONS.slice(0, 4) // حاضر / غائب / متأخر / معذور

  const mutation = useMutation({
    mutationFn: () => api.patch(`/sessions/${session._id}/finish`, {
      attendanceStatus, attendanceNotes, teacherNotes,
      homework: addHomework && hwTitle && hwDue ? { titleAr: hwTitle, descriptionAr: hwDesc, dueDate: hwDue } : undefined,
      evaluation: addEval ? { type: evalType, score: Number(evalScore), notesAr: evalNotes } : undefined,
    }),
    onSuccess: () => {
      toast.success('تم حفظ الحصة وإنهاؤها بنجاح')
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions', 'month'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions', 'history'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'students'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] })
      onClose()
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  })

  return (
    <Modal open onClose={onClose} title="إنهاء الحصة" size="md"
      footer={
        <Button variant="purple" className="w-full !py-3 !text-base font-bold" onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!attendanceStatus}>
          حفظ وإنهاء الحصة
        </Button>
      }
    >
      <div className="space-y-5" dir="rtl">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f5ff]">
          <Avatar src={getFileUrl(session.studentId?.avatar)} firstName={session.studentId?.firstNameAr} lastName={session.studentId?.lastNameAr} size="sm" />
          <div>
            <div className="font-bold text-sm text-brand-textBody">{session.studentId?.firstNameAr} {session.studentId?.lastNameAr}</div>
            <div className="text-xs text-[#9b7fd6]">{session.titleAr}</div>
          </div>
        </div>

        {/* Student Attendance — required */}
        <div>
          <label className={LBL}>حضور الطالب *</label>
          <div className="grid grid-cols-4 gap-2">
            {attOptions.map(opt => (
              <button key={opt.value} type="button" onClick={() => setAttendanceStatus(opt.value)}
                className="py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: attendanceStatus === opt.value ? opt.bg : '#f9fafb',
                  color: attendanceStatus === opt.value ? opt.color : '#9ca3af',
                  border: attendanceStatus === opt.value ? `1.5px solid ${opt.color}` : '1.5px solid transparent',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Teacher Notes — optional */}
        <div>
          <label className={LBL}>ملاحظات المعلم (اختياري)</label>
          <textarea value={teacherNotes} onChange={e => setTeacherNotes(e.target.value)} rows={2}
            className="field-light resize-none w-full" placeholder="ملاحظاتك عن أداء الطالب في هذه الحصة..." />
          <textarea value={attendanceNotes} onChange={e => setAttendanceNotes(e.target.value)} rows={1}
            className="field-light resize-none w-full mt-2" placeholder="ملاحظة عن الحضور (اختياري)..." />
        </div>

        {/* Homework — optional */}
        <div className="rounded-xl border border-gray-100 p-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={addHomework} onChange={e => setAddHomework(e.target.checked)} className="w-4 h-4 accent-brand-purple" />
            <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><FileText size={14} strokeWidth={2} /> تعيين واجب (اختياري)</span>
          </label>
          {addHomework && (
            <div className="mt-3 space-y-3">
              <input value={hwTitle} onChange={e => setHwTitle(e.target.value)} className={FIELD} placeholder="عنوان الواجب *" />
              <textarea value={hwDesc} onChange={e => setHwDesc(e.target.value)} rows={2} className="field-light resize-none w-full" placeholder="الوصف (اختياري)" />
              <input type="date" value={hwDue} onChange={e => setHwDue(e.target.value)} className={FIELD} />
            </div>
          )}
        </div>

        {/* Evaluation — optional */}
        <div className="rounded-xl border border-gray-100 p-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={addEval} onChange={e => setAddEval(e.target.checked)} className="w-4 h-4 accent-brand-purple" />
            <span className="text-sm font-bold text-gray-700 flex items-center gap-1.5"><Star size={14} strokeWidth={2} /> إضافة تقييم (اختياري)</span>
          </label>
          {addEval && (
            <div className="mt-3 space-y-3">
              <select value={evalType} onChange={e => setEvalType(e.target.value)} className={FIELD}>
                {[['tajweed','التجويد'],['hifz','الحفظ'],['nazra','القراءة'],['behavior','السلوك'],['general','عام']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">الدرجة: {evalScore}/١٠</label>
                <input type="range" min="1" max="10" step="1" value={evalScore}
                  onChange={e => setEvalScore(Number(e.target.value))} className="w-full h-2 rounded-full accent-brand-purple" />
              </div>
              <textarea value={evalNotes} onChange={e => setEvalNotes(e.target.value)} rows={2} className="field-light resize-none w-full" placeholder="ملاحظات التقييم..." />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
