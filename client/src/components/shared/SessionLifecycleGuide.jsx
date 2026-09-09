import { useState } from 'react'
import {
  UserPlus, CalendarCheck, Clock3, Video, CheckCircle2, Wallet,
  BadgeDollarSign, BookOpen, ShieldCheck, RefreshCw, Info,
} from 'lucide-react'
import Modal from '../ui/Modal.jsx'

// One canonical journey, filtered per role — mirrors docs/SESSION_LIFECYCLE_GUIDE_AR.md
// exactly (same source of truth, just presented as a short visual timeline
// instead of a document). Keep the two in sync when a real business rule
// changes; this file is not the place to invent a new one.
const STEPS = [
  {
    icon: UserPlus, roles: ['admin'],
    title: 'إضافة الطالب واختيار الباقة',
    body: 'تُنشئ الإدارة حساب الطالب ومحفظة حصصه. الباقة اختيارية عند الإضافة ويمكن ربطها لاحقًا.',
  },
  {
    icon: CalendarCheck, roles: ['admin', 'teacher', 'student'],
    title: 'الجدولة وموافقة المعلم',
    body: 'يُختار الجدول ويُتحقق من التوفر الحقيقي فورًا. الطالب الجديد يحتاج موافقة المعلم قبل التفعيل؛ الطالب القديم يُفعَّل مباشرة.',
  },
  {
    icon: Clock3, roles: ['admin', 'teacher', 'student'],
    title: 'الاستعداد قبل الحصة',
    body: 'يفتح تسجيل حضور المعلم قبل الموعد بـ٦٠ دقيقة فقط — قبل ذلك تظهر الحصة "لم يفتح تسجيل الحضور بعد"، وهذا مقصود وليس عطلاً.',
  },
  {
    icon: Video, roles: ['admin', 'teacher', 'student'],
    title: 'الانضمام للحصة',
    body: 'فتح رابط الاجتماع الخارجي دليل فقط على محاولة الدخول — ولا يُعتبر إثباتًا للحضور الفعلي وحده.',
  },
  {
    icon: CheckCircle2, roles: ['admin', 'teacher'],
    title: 'إنهاء الحصة وتسجيل الحضور',
    body: 'يسجّل المعلم حضور الطالب (إلزامي) مع ملاحظات ثم واجب وتقييم اختياريين — كل ذلك في خطوة واحدة.',
  },
  {
    icon: Wallet, roles: ['admin', 'teacher', 'student'],
    title: 'أثر الرصيد',
    body: 'الحضور أو الغياب غير المعذور يخصم حصة. الإلغاء أو الغياب من طرف الأكاديمية (معلم/نظام) يُعيد الحصة ويمنح حصة تعويضية تلقائيًا.',
  },
  {
    icon: BadgeDollarSign, roles: ['admin', 'teacher'],
    title: 'أجر المعلم',
    body: 'مستقل تمامًا عن حضور الطالب — يُصرف بمجرد أن يسجّل المعلم حضوره ويُكمل الحصة، حتى لو غاب الطالب.',
  },
  {
    icon: BookOpen, roles: ['admin', 'teacher', 'student'],
    title: 'تقرير الحلقة والواجب والتقييم',
    body: 'تقرير الحفظ/المراجعة منفصل عن تسجيل الحضور، وله متابعة مستقلة للحصص المتأخرة عن التقرير.',
  },
  {
    icon: ShieldCheck, roles: ['admin'],
    title: 'مراجعة الإدارة',
    body: 'أي تصحيح إداري لحالة الحضور أو الأجر يصبح نهائيًا ولا يُستبدل تلقائيًا بعد ذلك.',
  },
  {
    icon: RefreshCw, roles: ['admin', 'student'],
    title: 'إغلاق الشهر والتجديد',
    body: 'التقرير الشهري ومسودة الرواتب تُنشأ تلقائيًا؛ اعتماد الصرف فعل إداري صريح دائمًا. لا تجديد أو خصم تلقائي للاشتراك مطلقًا — الاستبيان والتنبيهات فقط، والتجديد الفعلي دائمًا بطلب من الطالب واعتماد من الإدارة.',
  },
]

const ROLE_LABELS = { admin: 'الإدارة', teacher: 'المعلم', student: 'الطالب' }

/**
 * Reusable "كيف تعمل الحصة؟" contextual guide — a simple role-aware timeline,
 * not a wall of text. Same canonical facts as docs/SESSION_LIFECYCLE_GUIDE_AR.md.
 * Mount from any admin/teacher/student session-related page: `<SessionLifecycleGuide role="teacher" onClose={...} />`.
 */
export default function SessionLifecycleGuide({ role = 'admin', onClose }) {
  const [showAll, setShowAll] = useState(false)
  const steps = STEPS.filter((s) => showAll || s.roles.includes(role))

  return (
    <Modal open onClose={onClose} title="كيف تعمل الحصة؟" size="md" closable
      footer={
        <button onClick={() => setShowAll((v) => !v)}
          className="text-xs font-bold text-violet-600 hover:text-violet-700">
          {showAll ? `عرض ما يخص ${ROLE_LABELS[role]} فقط` : 'عرض الرحلة الكاملة (كل الأطراف)'}
        </button>
      }
    >
      <div dir="rtl" className="space-y-1">
        <div className="flex items-start gap-2 rounded-xl bg-violet-50 border border-violet-100 px-3 py-2.5 mb-4">
          <Info size={15} className="text-violet-500 flex-none mt-0.5" />
          <p className="text-[11px] font-semibold text-violet-700">
            رحلة الحصة كاملة من إضافة الطالب حتى التجديد — بتوقيت الأكاديمية (القاهرة).
          </p>
        </div>

        <ol className="relative ps-8">
          <div className="absolute top-1 bottom-1 start-[15px] w-px bg-gray-200" aria-hidden="true" />
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <li key={step.title} className="relative pb-5 last:pb-0">
                <span className="absolute start-[-32px] top-0 w-8 h-8 rounded-full bg-white border-2 border-violet-200 flex items-center justify-center">
                  <Icon size={14} strokeWidth={2} className="text-violet-600" />
                </span>
                <div className="text-sm font-bold text-gray-800">{i + 1}. {step.title}</div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.body}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </Modal>
  )
}
