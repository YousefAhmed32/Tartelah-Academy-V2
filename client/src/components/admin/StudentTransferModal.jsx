import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowLeftRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Spinner from '../ui/Spinner.jsx'
import PersonCombobox from '../ui/PersonCombobox.jsx'
import { transferService } from '../../services/transfer.service.js'
import { dayLabel, conflictLabel } from '../../utils/assignmentSchedule.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

// Dedicated active-student transfer workflow (Phase 2 meeting addendum §3) —
// distinct from AssignmentRequest reassignment, which only ever applies to a
// still-PENDING request. Reachable from the student profile, teacher
// profile, or any surface that renders it with a studentId + currentTeacher.
export default function StudentTransferModal({ studentId, currentTeacherName, onClose, onSuccess }) {
  const qc = useQueryClient()
  const [step, setStep] = useState('form') // 'form' | 'preview'
  const [form, setForm] = useState({ targetTeacherId: '', reason: '', effectiveDate: new Date().toISOString().slice(0, 10) })
  const [decisions, setDecisions] = useState({}) // { [ruleId]: {dayOfWeek,time} | 'keep' }

  const previewMut = useMutation({
    mutationFn: () => transferService.previewStudentTransfer(studentId, {
      targetTeacherId: form.targetTeacherId, effectiveDate: form.effectiveDate,
    }).then(r => r.data.data),
    onSuccess: () => setStep('preview'),
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ في المعاينة'),
  })

  const executeMut = useMutation({
    mutationFn: () => transferService.executeStudentTransfer(studentId, {
      targetTeacherId: form.targetTeacherId, effectiveDate: form.effectiveDate, reason: form.reason,
      scheduleDecisions: decisions,
    }).then(r => r.data),
    onSuccess: (res) => {
      toast.success(res.message || 'تم نقل الطالب بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'student', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'transfers'] })
      onSuccess?.()
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'تعذّر تنفيذ النقل — قد يكون الموعد لم يعد متاحًا، يرجى إعادة المعاينة'),
  })

  const preview = previewMut.data
  const conflictRules = preview?.scheduleResolution?.filter((r) => !r.valid) || []
  const allConflictsResolved = conflictRules.every((r) => {
    const d = decisions[String(r.rule._id)]
    return d && d !== 'keep'
  })

  return (
    <Modal open onClose={onClose} title="نقل الطالب إلى معلم آخر" size="lg"
      footer={step === 'form' ? (
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button variant="purple" icon={<ArrowLeftRight size={14} />} loading={previewMut.isPending}
            disabled={!form.targetTeacherId || !form.reason.trim()}
            onClick={() => previewMut.mutate()}>معاينة النقل</Button>
        </>
      ) : (
        <>
          <Button variant="ghost" onClick={() => setStep('form')}>رجوع</Button>
          <Button variant="purple" loading={executeMut.isPending} disabled={!allConflictsResolved}
            onClick={() => executeMut.mutate()}>تأكيد النقل</Button>
        </>
      )}>
      <div className="space-y-4" dir="rtl">
        {step === 'form' && (
          <>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600">
              المعلم الحالي: <span className="font-bold text-gray-800">{currentTeacherName || 'غير محدد'}</span>
            </div>
            <PersonCombobox
              role="teacher" label="المعلم الجديد" required
              value={form.targetTeacherId || null}
              onChange={(id) => setForm(p => ({ ...p, targetTeacherId: id || '' }))}
            />
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">تاريخ السريان</label>
              <input type="date" className={inputCls} value={form.effectiveDate} onChange={(e) => setForm(p => ({ ...p, effectiveDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">سبب النقل (إلزامي)</label>
              <textarea className={`${inputCls} h-16 resize-none py-2`} value={form.reason}
                onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="مثال: رغبة الطالب، تعارض الجدول..." />
            </div>
          </>
        )}

        {step === 'preview' && (
          previewMut.isPending ? <div className="flex justify-center py-8"><Spinner /></div> : preview && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[11px] text-emerald-700 font-bold mb-1">سيبقى دون تغيير</div>
                  <ul className="text-xs text-emerald-800 space-y-0.5">
                    <li>رصيد المحفظة ({preview.walletRemaining} حصة)</li>
                    <li>كل الحصص والتقارير والتقييمات السابقة تحت المعلم الحالي</li>
                  </ul>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="text-[11px] text-amber-700 font-bold mb-1">سيتغيّر</div>
                  <ul className="text-xs text-amber-800 space-y-0.5">
                    <li>المعلم المسؤول عن الاشتراك</li>
                    <li>{preview.futureSessionsCount} حصة مستقبلية ستُلغى وتُستبدل بحصص مع المعلم الجديد</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-700">جدول الطالب مع المعلم الجديد:</div>
                {preview.scheduleResolution?.map((r) => (
                  <div key={r.rule._id} className={`p-3 rounded-xl border text-xs ${r.valid ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {r.valid ? <CheckCircle2 size={13} className="text-emerald-600" /> : <AlertTriangle size={13} className="text-red-600" />}
                      <span className="font-bold">{r.days.map((d) => `${dayLabel(d.dayOfWeek)} ${d.time}`).join(' · ')}</span>
                      {r.valid && <span className="text-emerald-600">متاح — سيبقى كما هو</span>}
                    </div>
                    {!r.valid && (
                      <div className="space-y-1.5">
                        <div className="text-red-600">{r.conflicts?.map((c) => conflictLabel(c)).join('، ')}</div>
                        <div className="text-gray-600">اختر موعدًا بديلاً:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {(r.alternatives || []).map((alt) => {
                            const selected = decisions[String(r.rule._id)]?.dayOfWeek === alt.dayOfWeek && decisions[String(r.rule._id)]?.time === alt.time
                            return (
                              <button key={`${alt.dayOfWeek}-${alt.time}`} type="button"
                                onClick={() => setDecisions(p => ({ ...p, [String(r.rule._id)]: alt }))}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${selected ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'}`}>
                                {dayLabel(alt.dayOfWeek)} {alt.time}
                              </button>
                            )
                          })}
                          {!r.alternatives?.length && <span className="text-gray-400">لا توجد مواعيد بديلة متاحة حاليًا لدى هذا المعلم</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </div>
    </Modal>
  )
}
