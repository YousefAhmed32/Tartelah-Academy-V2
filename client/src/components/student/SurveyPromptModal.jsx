import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Star } from 'lucide-react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { surveyService } from '../../services/survey.service.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

function StarRating({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 mb-1.5 block">{label}</label>
      <div className="flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} className="p-1 min-w-[40px] min-h-[40px] flex items-center justify-center" aria-label={`${n} من 5`}>
            <Star size={22} fill={n <= value ? '#f59e0b' : 'none'} stroke={n <= value ? '#f59e0b' : '#d1d5db'} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  )
}

// Evaluation/renewal survey (Phase 2 §13) — accessible, mobile-friendly
// (large 44px+ touch targets, simple single-scroll form). Never renews or
// charges anything by itself — `renewalIntention` is informational, and
// `requestTeacherChange` only flags the request for an admin to act on
// through the existing transfer workflow.
export default function SurveyPromptModal({ survey, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    teacherCommitmentRating: 0, academyFollowUpRating: 0, reportQualityRating: 0, studentProgressRating: 0, recommendLikelihood: 0,
    notes: '', renewalIntention: '', continueWithSameTeacher: true, requestTeacherChange: false, requestAdminContact: false,
  })
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const submitMut = useMutation({
    mutationFn: () => surveyService.submitResponse(survey._id, form),
    onSuccess: () => { toast.success('شكرًا لتقييمك!'); qc.invalidateQueries({ queryKey: ['student', 'survey', 'pending'] }); onClose() },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })
  const skipMut = useMutation({
    mutationFn: () => surveyService.skip(survey._id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['student', 'survey', 'pending'] }); onClose() },
  })

  const ratingsComplete = form.teacherCommitmentRating && form.academyFollowUpRating && form.studentProgressRating

  return (
    <Modal open onClose={() => skipMut.mutate()} title="رأيك يهمنا" size="md"
      footer={<>
        <Button variant="ghost" onClick={() => skipMut.mutate()}>لاحقًا</Button>
        <Button variant="purple" loading={submitMut.isPending} disabled={!ratingsComplete} onClick={() => submitMut.mutate()}>إرسال التقييم</Button>
      </>}>
      <div dir="rtl" className="space-y-4">
        <p className="text-xs text-gray-500">قبل تجديد اشتراكك، نود معرفة رأيك في تجربتك مع {survey.teacherId?.firstNameAr} خلال هذه الفترة.</p>
        <StarRating label="التزام المعلم وأداؤه" value={form.teacherCommitmentRating} onChange={(v) => set('teacherCommitmentRating', v)} />
        <StarRating label="متابعة الأكاديمية وجودة التقارير" value={form.academyFollowUpRating} onChange={(v) => set('academyFollowUpRating', v)} />
        <StarRating label="جودة التقارير" value={form.reportQualityRating} onChange={(v) => set('reportQualityRating', v)} />
        <StarRating label="تقدّمك في الحفظ والتلاوة" value={form.studentProgressRating} onChange={(v) => set('studentProgressRating', v)} />
        <StarRating label="احتمالية أن توصي بنا للآخرين" value={form.recommendLikelihood} onChange={(v) => set('recommendLikelihood', v)} />

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">هل تنوي تجديد الاشتراك؟</label>
          <div className="grid grid-cols-3 gap-2">
            {[['yes', 'نعم'], ['undecided', 'لم أقرر'], ['no', 'لا']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set('renewalIntention', v)}
                className={`h-11 rounded-xl text-sm font-bold border ${form.renewalIntention === v ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>{l}</button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-1">
          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-violet-600" checked={form.continueWithSameTeacher} onChange={(e) => set('continueWithSameTeacher', e.target.checked)} />
          أرغب بالاستمرار مع نفس المعلم
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-1">
          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-violet-600" checked={form.requestTeacherChange} onChange={(e) => set('requestTeacherChange', e.target.checked)} />
          أرغب بطلب تغيير المعلم
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-1">
          <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-violet-600" checked={form.requestAdminContact} onChange={(e) => set('requestAdminContact', e.target.checked)} />
          أرغب أن تتواصل معي الإدارة
        </label>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات واقتراحات (اختياري)</label>
          <textarea className={`${inputCls} h-20 py-2 resize-none`} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
