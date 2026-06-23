import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/constants.js'

const programs = [
  { title: 'تجويد القرآن الكريم', desc: 'تعلم أحكام التجويد من المقدمة الجزرية وغيرها من المتون المعتمدة. دروس تفاعلية مع تطبيق عملي مستمر.', level: 'جميع المستويات', sessions: '٨', icon: '📖' },
  { title: 'حفظ القرآن الكريم', desc: 'منهج مدروس للحفظ والمراجعة مع متابعة يومية من معلم متخصص. تقارير دورية لقياس التقدم.', level: 'متوسط - متقدم', sessions: '١٢', icon: '🌙' },
  { title: 'قراءة القرآن للمبتدئين', desc: 'من القاعدة النورانية والبغدادية حتى الطلاقة في القراءة. مناسب للكبار والصغار.', level: 'مبتدئ', sessions: '٨', icon: '✨' },
  { title: 'اللغة العربية للقرآن', desc: 'فهم معاني القرآن من خلال تعلم مبادئ اللغة العربية والنحو والصرف.', level: 'جميع المستويات', sessions: '١٠', icon: '🔤' },
]

export default function ProgramsPage() {
  return (
    <div className="bg-brand-dark min-h-screen pt-28 pb-20 px-[clamp(20px,5vw,68px)]" dir="rtl">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="font-heading font-extrabold text-4xl text-white text-center mb-4">مسارات التعلم</h1>
        <p className="text-center mb-12" style={{ color: '#b3a4d0' }}>برامج تعليمية متخصصة لجميع المستويات والأعمار</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {programs.map((p, i) => (
            <div key={i} className="rounded-card p-8" style={{ background: '#1d0a3f', border: '1px solid rgba(150,120,220,0.14)' }}>
              <div className="text-4xl mb-5">{p.icon}</div>
              <h3 className="font-heading font-bold text-white text-xl mb-3">{p.title}</h3>
              <p className="text-sm leading-relaxed mb-5" style={{ color: '#b3a4d0' }}>{p.desc}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bf0' }}>{p.level}</span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(232,199,106,0.15)', color: '#E8C76A' }}>{p.sessions} حصص/شهر</span>
              </div>
              <Link to={ROUTES.REGISTER} className="btn-gold block text-center mt-6 text-sm py-3">التسجيل في البرنامج</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
