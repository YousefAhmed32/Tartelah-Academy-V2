import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/constants.js'
import { Sparkles, GraduationCap, Crown, ArrowRight, Layers, Users } from 'lucide-react'

// Real age-tier program groups, exactly as structured in the academy's
// official content (datatoadd.md) — not a generic invented program list.
const programs = [
  {
    id: 'kids',
    title: 'كورسات الأطفال',
    desc: 'نور البيان لتأسيس القراءة، الكورس المتكامل (قرآن، تجويد، تفسير، سيرة، آداب)، تدبر وحفظ جزء النبأ، والسيرة النبوية للأطفال.',
    ageRange: 'من 4 سنوات فما فوق',
    icon: Sparkles,
    isGoldTag: false,
  },
  {
    id: 'rising-generation',
    title: 'كورسات الجيل الصاعد',
    desc: 'التأسيس المكثف في القراءة والقرآن، القرآن الكريم والتجويد، والعلوم الشرعية للناشئة والشباب.',
    ageRange: 'من 9 إلى 18 عامًا',
    icon: GraduationCap,
    isGoldTag: true,
  },
  {
    id: 'elite',
    title: 'كورسات الصفوة',
    desc: 'حفظ القرآن الكريم للكبار، التجويد للكبار، والفقه الإسلامي للكبار — لأن العمر لا يقف حائلًا بينك وبين حفظ كتاب الله.',
    ageRange: '20 سنة فأكثر',
    icon: Crown,
    isGoldTag: false,
  },
]

export default function ProgramsPage() {
  return (
    /* تدرج الموجة الخطي الاحترافي لحماية النيفبار وإبراز الجزء السفلي */
    <div className="min-h-screen pt-36 pb-28 px-[clamp(24px,6vw,80px)] relative bg-gradient-to-b from-[#11052c] via-[#1a0b3e] via-25% to-white to-55% font-sans antialiased text-gray-800" dir="rtl">
      
      {/* هالة ضوئية خلفية ناعمة */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-br from-purple-600/10 via-transparent to-purple-800/5 blur-[140px] pointer-events-none" />

      <div className="max-w-[1280px] mx-auto relative z-10">
        
        {/* شارة الترحيب النيومودرن */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-950/40 text-purple-200 text-xs font-medium backdrop-blur-md">
            <Layers className="w-3.5 h-3.5 text-[#E8C76A]" />
            خطتك التعليمية المخصصة
          </div>
        </div>

        {/* الهيدر الفخم المضيء */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight mb-4">
            مسارات التعلّم والبرامج
          </h1>
          <p className="text-base text-purple-200/80 leading-relaxed font-normal">
            اختر البرنامج المناسب لمستواك الحالي وابدأ رحلتك التفاعلية المباشرة مع نخبة من خيرة المعلمين المعتمدين.
          </p>
        </div>

        {/* شبكة البطاقات المصممة بنظافة فائقة لتبدو بارزة على المساحة البيضاء */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mt-10">
          {programs.map((p) => {
            const IconComponent = p.icon
            return (
              <div 
                key={p.id} 
                className="group relative flex flex-col justify-between rounded-3xl p-8 md:p-10 bg-white border border-gray-100 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(17,5,44,0.06)]"
              >
                <div>
                  {/* الهيدر الداخلي للكارد: محاذاة الأيقونة لليمين مع اتجاه القراءة العربي */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    
                    {/* شارة الفئة العمرية — بيانات حقيقية من محتوى الأكاديمية */}
                    <span
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1"
                      style={{
                        backgroundColor: p.isGoldTag ? 'rgba(232,199,106,0.08)' : 'rgba(147,51,234,0.05)',
                        borderColor: p.isGoldTag ? 'rgba(232,199,106,0.2)' : 'rgba(147,51,234,0.1)',
                        color: p.isGoldTag ? '#b58e1d' : '#6b21a8'
                      }}
                    >
                      <Users className="w-3 h-3 opacity-70" />
                      {p.ageRange}
                    </span>
                  </div>

                  {/* النصوص منسقة تماماً بـ line-height مريح */}
                  <div className="space-y-3">
                    <h3 className="font-heading font-black text-gray-900 text-2xl tracking-tight group-hover:text-purple-700 transition-colors">
                      {p.title}
                    </h3>
                    <p className="text-sm md:text-base leading-[1.6] text-gray-500 font-normal">
                      {p.desc}
                    </p>
                  </div>
                </div>

                {/* زر الانضمام المودرن الفخم */}
                <div className="mt-8">
                  <Link
                    to={ROUTES.COURSES}
                    className="w-full flex items-center justify-center gap-2 text-center text-sm font-black py-4 rounded-xl transition-all duration-300 border border-purple-600 bg-transparent text-purple-600 hover:bg-purple-600 hover:text-white"
                  >
                    <span>استكشف كورسات هذا المسار</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}