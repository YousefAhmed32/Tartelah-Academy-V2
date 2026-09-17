import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  ShieldAlert,
  Star,
  User,
} from 'lucide-react'
import { isQuranReportReady } from './quranReportFormState.js'

const LEVEL_OPTIONS = [
  { value: 'excellent', label: 'ممتاز', active: 'bg-emerald-600 border-emerald-600 text-white', idle: 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100' },
  { value: 'very_good', label: 'جيد جدًا', active: 'bg-blue-600 border-blue-600 text-white', idle: 'bg-blue-50/70 border-blue-200 text-blue-800 hover:bg-blue-100' },
  { value: 'good', label: 'جيد', active: 'bg-amber-600 border-amber-600 text-white', idle: 'bg-amber-50/70 border-amber-200 text-amber-800 hover:bg-amber-100' },
  { value: 'needs_followup', label: 'يحتاج متابعة', active: 'bg-rose-600 border-rose-600 text-white', idle: 'bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100' },
]

const QUICK_SURAHS = ['سورة البقرة', 'سورة الكهف', 'سورة يس', 'سورة الملك', 'جزء عم', 'جزء تبارك']

const inputClass = 'w-full min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 leading-normal text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-400'
const textareaClass = `${inputClass} resize-none`

function LevelSelector({ label, value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-700">{label}</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {LEVEL_OPTIONS.map((option) => {
          const selected = value === option.value || value === option.label
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${selected ? option.active : option.idle}`}
              aria-pressed={selected}
            >
              {selected && <CheckCircle2 size={14} aria-hidden="true" />}
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Section({ icon: Icon, iconClass, title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${iconClass}`}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <div>
          <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

export default function QuranReportInlineForm({ fields, onChange }) {
  const set = (key, value) => onChange({ ...fields, [key]: value })
  const ready = isQuranReportReady(fields)

  return (
    <div className="space-y-4" aria-label="تقرير الحصة القرآنية">
      <div className={`rounded-xl border px-3.5 py-3 flex items-start gap-2.5 ${ready ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
        {ready ? <CheckCircle2 size={17} className="text-emerald-600 flex-none mt-0.5" /> : <AlertTriangle size={17} className="text-amber-600 flex-none mt-0.5" />}
        <div className="text-xs leading-relaxed">
          <span className="font-extrabold">{ready ? 'التقرير جاهز للإرسال' : 'أكمل إنجاز الحلقة'}</span>
          <span className="block mt-0.5">يلزم تسجيل ما تم تسميعه أو مراجعته؛ وباقي البيانات تحسّن متابعة الطالب.</span>
        </div>
      </div>

      <Section
        icon={BookOpen}
        iconClass="bg-violet-50 text-violet-700"
        title="أولًا: إنجاز الحلقة"
        description="ما تم إنجازه وتسميعه ومراجعته خلال حلقة اليوم"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500">إدراج سريع:</span>
          {QUICK_SURAHS.map((surah) => (
            <button
              key={surah}
              type="button"
              onClick={() => set('todayRecitation', fields.todayRecitation?.trim() ? `${fields.todayRecitation}، ${surah}` : surah)}
              className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-bold text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            >
              + {surah}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">ما تم تسميعه في حلقة اليوم</label>
            <textarea rows={3} className={textareaClass} value={fields.todayRecitation} onChange={(e) => set('todayRecitation', e.target.value)} placeholder="السورة وأرقام الآيات..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">ما تم مراجعته</label>
            <textarea rows={3} className={textareaClass} value={fields.todayRevision} onChange={(e) => set('todayRevision', e.target.value)} placeholder="أجزاء أو سور المراجعة..." />
          </div>
        </div>
      </Section>

      <Section
        icon={HeartHandshake}
        iconClass="bg-blue-50 text-blue-700"
        title="ثانيًا: المطلوب للحلقة القادمة"
        description="التسميع والمراجعة والآداب والتجويد المطلوبة من الطالب"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[
            ['nextRecitation', 'التسميع المطلوب', 'السورة والآيات المطلوب حفظها...'],
            ['nextRevision', 'المراجعة المطلوبة', 'السور المطلوب مراجعتها...'],
            ['nextManners', 'الآداب / الأحاديث', 'الحديث أو الأدب المطلوب...'],
            ['nextTajweed', 'التجويد', 'حكم التجويد أو القاعدة المطلوبة...'],
          ].map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{label}</label>
              <input className={inputClass} value={fields[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">رابط المصحف أو المرجع (اختياري)</label>
            <div className="relative">
              <ExternalLink size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="url" dir="ltr" className={`${inputClass} ps-10 text-left`} value={fields.quranLink} onChange={(e) => set('quranLink', e.target.value)} placeholder="https://quran.com/..." />
            </div>
          </div>
        </div>
      </Section>

      <Section
        icon={Star}
        iconClass="bg-amber-50 text-amber-700"
        title="ثالثًا: تقييم المعلم للطالب"
        description="تقييم مستوى الحفظ والمراجعة والتجويد والتفاعل"
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <LevelSelector label="مستوى الحفظ والتسميع" value={fields.memorizationLevel} onChange={(v) => set('memorizationLevel', v)} />
          <LevelSelector label="مستوى المراجعة" value={fields.revisionLevel} onChange={(v) => set('revisionLevel', v)} />
          <LevelSelector label="التجويد والتلاوة" value={fields.tajweedLevel} onChange={(v) => set('tajweedLevel', v)} />
          <LevelSelector label="الالتزام والتفاعل" value={fields.engagementLevel} onChange={(v) => set('engagementLevel', v)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">التقييم العام للطالب</label>
          <textarea rows={2} className={textareaClass} value={fields.generalEvaluation} onChange={(e) => set('generalEvaluation', e.target.value)} placeholder="ملاحظاتك حول تركيز الطالب وتقدمه..." />
        </div>
      </Section>

      <Section
        icon={User}
        iconClass="bg-emerald-50 text-emerald-700"
        title="رابعًا: ملاحظات لولي الأمر"
        description="توجيهات مباشرة للأسرة لدعم متابعة الطالب في المنزل"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات لولي الأمر</label>
            <textarea rows={3} className={textareaClass} value={fields.parentNotes} onChange={(e) => set('parentNotes', e.target.value)} placeholder="توجيهات المتابعة وتثبيت الحفظ..." />
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1.5">
              <ShieldAlert size={15} className="text-amber-600" aria-hidden="true" />
              <span>تنبيه هام (اختياري)</span>
            </label>
            <textarea rows={3} className="w-full min-h-[44px] rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 leading-normal text-sm text-amber-950 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 placeholder:text-amber-400 resize-none" value={fields.importantAlert} onChange={(e) => set('importantAlert', e.target.value)} placeholder="موعد، تغيير، أو ملاحظة تستدعي انتباه الأسرة..." />
          </div>
        </div>
      </Section>
    </div>
  )
}
