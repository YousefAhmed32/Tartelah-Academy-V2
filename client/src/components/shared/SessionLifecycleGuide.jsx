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
    <Modal open onClose={onClose} title="دليل الحصص: كيف تعمل الحصة؟" size="lg" closable
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={13} />
            {showAll ? `عرض ما يخص ${ROLE_LABELS[role]} فقط` : 'عرض الرحلة الكاملة (كل الأطراف)'}
          </button>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            إغلاق
          </button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-2xl bg-gradient-to-r from-violet-50 to-purple-50/50 border border-violet-100 p-3.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center flex-none mt-0.5 shadow-sm">
            <Info size={16} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-violet-900">
              دورة حياة الحصة التشغيلية بالأكاديمية ({ROLE_LABELS[role] || 'العام'})
            </h4>
            <p className="text-[11px] text-violet-700/90 mt-0.5 leading-relaxed">
              توضيح تسلسل الحصة خطوة بخطوة من إضافة الطالب والجدولة حتى تسجيل الحضور وتأثير الرصيد والراتب، بتوقيت الأكاديمية (القاهرة).
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {steps.map((step, i) => {
            const Icon = step.icon
            const isLast = i === steps.length - 1
            return (
              <div key={step.title} className="flex items-start gap-3 group">
                {/* Timeline icon + vertical connecting line */}
                <div className="flex flex-col items-center flex-none">
                  <div className="w-9 h-9 rounded-2xl bg-violet-50 border border-violet-200/80 flex items-center justify-center text-violet-600 shadow-sm group-hover:bg-violet-600 group-hover:text-white transition-all">
                    <Icon size={16} strokeWidth={2} />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 min-h-[30px] flex-1 bg-violet-100 my-1 rounded-full" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-violet-100 text-violet-700 text-[11px] font-extrabold">
                      {i + 1}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{step.title}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed bg-gray-50/70 border border-gray-100 p-2.5 rounded-xl">
                    {step.body}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
