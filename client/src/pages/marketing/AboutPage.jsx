import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ROUTES } from '../../config/constants.js'
import api from '../../utils/api.js'
import useMotionCapabilities from '../../hooks/useMotionCapabilities.js'
import RevealSection from '../../components/motion/RevealSection.jsx'
import StaggerGroup from '../../components/motion/StaggerGroup.jsx'
import { EASE_CINEMATIC, itemVariant } from '../../components/motion/motion.constants.js'
import {
  Users,
  Globe,
  BookOpen,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Target,
  Eye,
  HeartHandshake
} from 'lucide-react'

const STATS = [
  { icon: Users, value: '+10,000', label: 'طالب وطالبة وثقوا بنا', tone: 'text-purple-400 bg-purple-500/10', shift: 'lg:translate-x-4', border: 'border-purple-950/40' },
  { icon: BookOpen, value: '+50,000', label: 'ساعة تعليمية تفاعلية', tone: 'text-amber-400 bg-amber-500/10', shift: 'lg:-translate-x-4', border: 'border-purple-400/20 shadow-purple-500/5' },
  { icon: Globe, value: '+25', label: 'دولة ينتشر فيها نفعنا', tone: 'text-emerald-400 bg-emerald-500/10', shift: 'lg:translate-x-2', border: 'border-purple-950/40' },
]

const VALUES = [
  {
    span: 'md:col-span-2',
    icon: CheckCircle2,
    tone: 'text-emerald-400',
    title: 'نخبة المقرئين والمجازين',
    body: 'نتبع معايير صارمة في استقطاب الكوادر التعليمية، حيث نضم فقط الصفوة من خريجي الأزهر الشريف والجامعات الإسلامية الكبرى، ممن يحملون إجازات قرآنية معتمدة ومتصلة بالسند النبوي الشريف ﷺ.',
    bg: 'bg-[#110531]',
  },
  {
    span: '',
    icon: CheckCircle2,
    tone: 'text-purple-400',
    title: 'خصوصية تامة وبيئة آمنة',
    body: 'فصول مستقلة بالكامل للنساء والأطفال لضمان أقصى درجات الأريحية والأمان أثناء التلقي.',
    bg: 'bg-gradient-to-br from-[#110531] to-[#1a0944]',
    small: true,
  },
  {
    span: '',
    icon: CheckCircle2,
    tone: 'text-[#e3be5a]',
    title: 'لوحة تحكم ومتابعة ذكية',
    body: 'تقارير أداء دورية تصل لأولياء الأمور لتقييم الحفظ والالتزام بالخطة الزمنية أولاً بأول.',
    bg: 'bg-gradient-to-tr from-[#110531] to-[#15063b]',
    small: true,
  },
  {
    span: 'md:col-span-2',
    icon: HeartHandshake,
    tone: 'text-blue-400',
    title: 'مرونة زمنية مطلقة تناسب جدولك',
    body: 'نعمل على مدار الساعة لتغطية كافة النطاقات الزمنية حول العالم، مما يتيح لك ولأطفالك اختيار الأوقات الأكثر ملاءمة دون تعارض مع الدراسة أو العمل.',
    bg: 'bg-[#110531]',
  },
]

export default function AboutPage() {
  const { data: settings } = useQuery({
    queryKey: ['academy-settings'],
    queryFn: () => api.get('/website/settings').then(r => r.data?.data || {}),
  })
  const { reducedMotion } = useMotionCapabilities()

  return (
    <div className="bg-[#0b031e] min-h-screen pt-28 lg:pt-36 pb-24 px-[clamp(20px,5vw,68px)] font-sans antialiased text-slate-200 selection:bg-purple-500/30" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-24 sm:space-y-28 lg:space-y-32">

        {/* ================= HERO: مقدمة قوية ومباشرة ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <RevealSection from="right" reducedMotion={reducedMotion} className="lg:col-span-7 space-y-6 text-right">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-[#160636] text-purple-300 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" aria-hidden="true" />
              أكثر من مجرد منصة.. نحن بيئتك القرآنية الآمنة
            </div>
            <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.12]">
              نعيد صياغة التعليم القرآني <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e3be5a] via-[#f5d06f] to-[#fff3d1]">
                بمعايير عالمية رصينة
              </span>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-slate-400 max-w-xl">
              رحلة تحفيظ وتجويد وتزكية، مصمّمة بعناية أكاديمية لتناسب كل عمر وكل مستوى، أينما كنت.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to={ROUTES.REGISTER}
                className="inline-flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl bg-[#e3be5a] hover:bg-[#d4b04d] text-[#0b031e] transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-amber-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e3be5a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b031e]"
              >
                ابدأ رحلتك الآن
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </Link>
              <a
                href="#who-we-are"
                className="inline-flex items-center gap-2 font-semibold px-7 py-3.5 rounded-xl border border-purple-400/25 text-purple-200 hover:border-purple-300/50 hover:bg-white/5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b031e]"
              >
                تعرف على قصتنا
              </a>
            </div>
          </RevealSection>

          {/* لوحة الإحصائيات المتداخلة */}
          <RevealSection from="left" delay={0.1} reducedMotion={reducedMotion} className="lg:col-span-5 relative flex flex-col gap-4 sm:flex-row lg:flex-col sm:justify-center">
            <div className="absolute inset-0 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" aria-hidden="true" />
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className={`relative group p-6 rounded-2xl bg-gradient-to-l from-[#110531] to-[#0d0426] border ${stat.border} shadow-xl transition-all duration-300 ${stat.shift}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.tone}`}>
                    <stat.icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white font-mono">{stat.value}</div>
                    <div className="text-xs text-slate-400">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </RevealSection>
        </section>

        {/* ================= من نحن ================= */}
        <section id="who-we-are" className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center scroll-mt-28">
          <RevealSection from="center" reducedMotion={reducedMotion} className="lg:col-span-4 order-2 lg:order-1">
            <div className="relative aspect-square max-w-[280px] mx-auto lg:mx-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/25 to-[#e3be5a]/10 blur-2xl" aria-hidden="true" />
              <div className="relative h-full w-full rounded-[32px] border border-purple-900/30 bg-[#110531] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle,#ffffff_1px,transparent_1px)] bg-[length:18px_18px]" aria-hidden="true" />
                <BookOpen className="w-16 h-16 sm:w-20 sm:h-20 text-[#e3be5a] relative z-10" strokeWidth={1.2} aria-hidden="true" />
              </div>
            </div>
          </RevealSection>

          <RevealSection from="right" delay={0.08} reducedMotion={reducedMotion} className="lg:col-span-8 order-1 lg:order-2 space-y-5 text-right">
            <span className="inline-flex text-xs font-bold tracking-[0.2em] uppercase text-purple-300 bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 rounded-full">
              من نحن
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-heading leading-tight">
              بيئة قرآنية <span className="text-[#e3be5a]">آمنة وأصيلة</span>
            </h2>
            <p className="text-lg sm:text-xl font-semibold text-slate-100 leading-relaxed max-w-2xl">
              منذ اللحظة الأولى، جعلنا هدفنا واضحًا: أن نصنع جيلًا يحمل القرآن نورًا في قلبه قبل أن يكون حروفًا على لسانه.
            </p>
            <p className="text-base leading-[1.9] text-slate-400 max-w-2xl whitespace-pre-line">
              {settings?.aboutBodyAr || 'أكاديمية قرآنية متخصصة في تعليم القرآن الكريم وأحكام التجويد واللغة العربية والعلوم الشرعية عن بُعد، بمنهجية علمية وإشراف أكاديمي متميز 🤍📖'}
            </p>
          </RevealSection>
        </section>

        {/* ================= قيمنا: Bento Grid ================= */}
        <section className="space-y-10">
          <RevealSection reducedMotion={reducedMotion} className="text-center max-w-xl mx-auto space-y-3">
            <span className="inline-flex text-xs font-bold tracking-[0.2em] uppercase text-[#e3be5a] bg-[#e3be5a]/10 border border-[#e3be5a]/20 px-4 py-1.5 rounded-full">
              قيمنا
            </span>
            <h2 className="text-3xl font-bold text-white font-heading">لماذا يختارنا الحُفّاظ؟</h2>
            <p className="text-sm text-purple-300/50">ركائز الجودة التنافسية التي تجعل ترتيلة خيارك الأمثل</p>
          </RevealSection>

          <StaggerGroup staggerChildren={0.1} viewportMargin="-60px" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((value) => (
              <motion.div
                key={value.title}
                variants={itemVariant({ y: reducedMotion ? 0 : 28, duration: 0.6, ease: EASE_CINEMATIC })}
                className={`${value.span} p-8 rounded-2xl ${value.bg} border border-purple-950/50 flex flex-col justify-between hover:border-purple-500/20 hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 ${value.tone}`}>
                    <value.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <h4 className={`font-bold text-white ${value.small ? 'text-base' : 'text-lg'}`}>{value.title}</h4>
                  </div>
                  <p className={`text-slate-400 leading-relaxed ${value.small ? 'text-xs sm:text-sm' : 'text-sm max-w-xl'}`}>
                    {value.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </StaggerGroup>
        </section>

        {/* ================= رسالتنا ورؤيتنا: بطل الصفحة ================= */}
        <section className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-purple-900/30 bg-gradient-to-b from-[#120530] via-[#0e0426] to-[#0b031e] px-6 py-14 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
          <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle,#ffffff_1px,transparent_1px)] bg-[length:24px_24px] pointer-events-none" aria-hidden="true" />
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#e3be5a]/10 blur-[100px] pointer-events-none" aria-hidden="true" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-purple-600/15 blur-[110px] pointer-events-none" aria-hidden="true" />

          <div className="relative z-10 space-y-12 lg:space-y-16">
            <RevealSection reducedMotion={reducedMotion} className="text-center max-w-2xl mx-auto space-y-4">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-[#e3be5a] bg-[#e3be5a]/10 border border-[#e3be5a]/20 px-4 py-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                جوهر رسالتنا
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-heading">رسالتنا ورؤيتنا</h2>
              <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
                الإطار الذي يوجّه كل قرار نتخذه، وكل حرف نُعلّمه
              </p>
            </RevealSection>

            <StaggerGroup staggerChildren={0.15} viewportMargin="-60px" className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* بطاقة الرسالة */}
              <motion.div
                variants={itemVariant({ x: reducedMotion ? 0 : 36, y: reducedMotion ? 0 : 20, duration: 0.7, ease: EASE_CINEMATIC })}
                whileHover={reducedMotion ? undefined : { y: -8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="group relative rounded-[28px] p-px bg-gradient-to-br from-[#e3be5a]/50 via-[#e3be5a]/10 to-transparent"
              >
                <div className="relative h-full rounded-[27px] bg-[#150733]/90 backdrop-blur-xl p-8 sm:p-10 lg:p-12 overflow-hidden flex flex-col justify-between space-y-10">
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#e3be5a]/10 blur-3xl group-hover:bg-[#e3be5a]/20 transition-all duration-500 pointer-events-none" aria-hidden="true" />
                  <div className="relative z-10 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#e3be5a] to-[#c99b3a] shadow-lg shadow-amber-500/20">
                        <Target className="w-6 h-6 text-[#0b031e]" aria-hidden="true" />
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-md bg-[#e3be5a]/10 text-[#e3be5a] border border-[#e3be5a]/20">رسالتنا</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white font-heading">كان خلقه القرآن</h3>
                    <p className="text-sm sm:text-base leading-relaxed text-slate-300 font-quran">
                      {settings?.missionQuoteAr || 'سُئلت السيدة عائشة (رضي الله عنها) عن خلق النبي صلى الله عليه وسلم فقالت: (( كان خلقه القرآن ))'}
                    </p>
                  </div>
                  <div className="relative z-10 border-t border-purple-950/60 pt-4 text-xs font-mono text-[#e3be5a] tracking-wider">
                    ESTABLISHED FOR EXCELLENCE // 2026
                  </div>
                </div>
              </motion.div>

              {/* بطاقة الرؤية */}
              <motion.div
                variants={itemVariant({ x: reducedMotion ? 0 : -36, y: reducedMotion ? 0 : 20, duration: 0.7, ease: EASE_CINEMATIC })}
                whileHover={reducedMotion ? undefined : { y: -8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="group relative rounded-[28px] p-px bg-gradient-to-br from-purple-500/50 via-purple-500/10 to-transparent"
              >
                <div className="relative h-full rounded-[27px] bg-[#150733]/90 backdrop-blur-xl p-8 sm:p-10 lg:p-12 overflow-hidden flex flex-col justify-between space-y-10">
                  <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl group-hover:bg-purple-500/20 transition-all duration-500 pointer-events-none" aria-hidden="true" />
                  <div className="relative z-10 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-800 shadow-lg shadow-purple-500/20">
                        <Eye className="w-6 h-6 text-white" aria-hidden="true" />
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">رؤيتنا</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-white font-heading">قرآنٌ يمشي على الأرض</h3>
                    <p className="text-sm sm:text-base leading-relaxed text-slate-300">
                      {settings?.visionAr || 'إعداد جيل قرآني متميز — كان صلى الله عليه وسلم: قرآنا يمشي على الأرض'}
                    </p>
                  </div>
                  <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-purple-950/40 pt-6">
                    <div>
                      <div className="text-xs text-purple-400 font-bold mb-1">المنهجية</div>
                      <div className="text-xs text-slate-400">أصالة وإسناد متصل</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#e3be5a] font-bold mb-1">الوسيلة</div>
                      <div className="text-xs text-slate-400">تقنيات غامرة وتفاعلية</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </StaggerGroup>
          </div>
        </section>

        {/* ================= خاتمة تحفظ في الذاكرة ================= */}
        <RevealSection as={motion.section} from="center" duration={0.9} reducedMotion={reducedMotion} className="text-center py-4">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-center gap-4" aria-hidden="true">
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#e3be5a]/60" />
              <Sparkles className="w-5 h-5 text-[#e3be5a]" />
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#e3be5a]/60" />
            </div>
            <p className="font-quran text-2xl sm:text-3xl lg:text-4xl leading-[1.9] text-slate-100">
              في <span className="text-[#e3be5a]">ترتيلة</span>، لا نصنع حفظة فحسب.. بل نُربّي جيلًا يحمل القرآن نورًا في قلبه، ومنهج حياة في كل خطوة يخطوها.
            </p>
          </div>
        </RevealSection>

        {/* ================= دعوة إلى الفعل ================= */}
        <RevealSection as={motion.section} reducedMotion={reducedMotion} className="relative rounded-2xl p-10 sm:p-12 bg-gradient-to-r from-[#17083d] to-[#0d0426] border border-purple-900/20 text-center overflow-hidden shadow-2xl">
          <div className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full bg-purple-600/5 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative z-10 max-w-xl mx-auto space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-white font-heading">ابدأ معاهدة القرآن برعاية تامة</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              احجز جلستك التقييمية المجانية الآن ليقوم أحد مشرفينا بتحديد مستواك الحالي واختيار المسار المناسب لك.
            </p>
            <div className="pt-2">
              <Link
                to={ROUTES.REGISTER}
                className="inline-flex items-center justify-center gap-3 font-bold px-10 py-4 rounded-xl bg-[#e3be5a] hover:bg-[#d4b04d] text-[#0b031e] transition-all duration-300 transform hover:scale-[1.02] shadow-xl shadow-amber-500/5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e3be5a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0426]"
              >
                <span>ابدأ جلستك التجريبية مجاناً</span>
                <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </RevealSection>

      </div>
    </div>
  )
}
