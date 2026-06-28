import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/constants.js'
import { 
  Users, 
  Globe, 
  BookOpen, 
  CheckCircle2, 
  ArrowLeft, 
  Sparkles,
  Trophy,
  HeartHandshake
} from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="bg-[#0b031e] min-h-screen pt-36 pb-24 px-[clamp(20px,5vw,68px)] font-sans antialiased text-slate-200 selection:bg-purple-500/30" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-32">
        
        {/* ================= القسم الأول: الـ Hero بتوزيع Split مائل وغير متماثل ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          {/* النص التسويقي الاستراتيجي */}
          <div className="lg:col-span-7 space-y-6 text-right">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-[#160636] text-purple-300 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              أكثر من مجرد منصة.. نحن بيئتك القرآنية الآمنة
            </div>
            <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight !leading-[1.1] hight-line-.1">
              نعيد صياغة التعليم  
              القرآني <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e3be5a] via-[#f5d06f] to-[#fff3d1]">
                بمعايير عالمية رصينة
              </span>
            </h1>
            <p className="text-base sm:text-lg leading-relaxed text-slate-400 max-w-xl">
              انطلقت <span className="text-white font-semibold">ترتيلة أونلاين</span> لتجسر الفجوة بين التقنيات الرقمية المتطورة والأصالة العلمية، لتقدم تجربة فريدة تخاطب العقل وتلامس الوجدان.
            </p>
          </div>

          {/* لوحة الإحصائيات المتداخلة (Asymmetric Stats Cluster) */}
          <div className="lg:col-span-5 relative flex flex-col gap-4 sm:flex-row lg:flex-col sm:justify-center">
            {/* بطاقة خلفية تعطي عمق إضاءة */}
            <div className="absolute inset-0 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative group p-6 rounded-2xl bg-gradient-to-l from-[#110531] to-[#0d0426] border border-purple-950/40 shadow-xl transition-all duration-300 lg:translate-x-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white font-mono">+10,000</div>
                  <div className="text-xs text-slate-400">طالب وطالبة وثقوا بنا</div>
                </div>
              </div>
            </div>

            <div className="relative group p-6 rounded-2xl bg-gradient-to-l from-[#110531] to-[#0d0426] border border-purple-400/20 shadow-xl shadow-purple-500/5 transition-all duration-300 lg:-translate-x-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white font-mono">+50,000</div>
                  <div className="text-xs text-slate-400">ساعة تعليمية تفاعلية</div>
                </div>
              </div>
            </div>

            <div className="relative group p-6 rounded-2xl bg-gradient-to-l from-[#110531] to-[#0d0426] border border-purple-950/40 shadow-xl transition-all duration-300 lg:translate-x-2">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white font-mono">+25</div>
                  <div className="text-xs text-slate-400">دولة ينتشر فيها نفعنا</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= القسم الثاني: التوجه الاستراتيجي (Featured Layout) ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* البطاقة الرئيسية الكبيرة (الرسالة والمهمة مجتمعة) */}
          <div className="lg:col-span-5 p-10 rounded-2xl bg-gradient-to-b from-[#14073c] to-[#0e042a] border border-purple-900/30 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <span className="text-xs font-bold px-3 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/10">رسالتنا الأسمى</span>
              <h3 className="text-2xl font-bold text-white font-heading">تأصيل وتيسير</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                نهدف إلى فتح آفاق جديدة لنشر علوم التنزيل الحكيم، متجاوزين حدود الجغرافيا والمكان لتصل الهوية القرآنية النقية لكل بيت مسلم.
              </p>
            </div>
            <div className="border-t border-purple-950/60 pt-4 text-xs font-mono text-[#e3be5a] tracking-wider">
              ESTABLISHED FOR EXCELLENCE // 2026
            </div>
          </div>

          {/* البطاقة الجانبية العريضة (الرؤية والهدف) */}
          <div className="lg:col-span-7 p-10 rounded-2xl bg-[#110531] border border-purple-950/40 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-[#e3be5a]">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white font-heading">رؤيتنا المستقبلية</h3>
              </div>
              <p className="text-sm sm:text-base leading-relaxed text-slate-400">
                نطمح لأن نكون المنظومة المرجعية الذكية الأولى عالمياً في منح الإجازات والأسانيد القرآنية المتصلة، مع تطوير أدوات قياس ذكاء اصطناعي تدعم دقة تصحيح التلاوة وتراعي الفروق الفردية للطلاب.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8 border-t border-purple-950/40 pt-6">
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
        </section>

        {/* ================= القسم الثالث: معايير القيمة بنظام الـ Bento Grid الحديث ================= */}
        <section className="space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-3xl font-bold text-white font-heading">لماذا يختارنا الحُفّاظ؟</h2>
            <p className="text-sm text-purple-300/50">ركائز الجودة التنافسية التي تجعل ترتيلة خيارك الأمثل</p>
          </div>

          {/* هيكل الـ Bento Grid الذكي */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* كارد Bento 1: عريض (المعلمون) */}
            <div className="md:col-span-2 p-8 rounded-2xl bg-[#110531] border border-purple-950/50 flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <h4 className="font-bold text-lg text-white">نخبة المقرئين والمجازين</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                  نتبع معايير صارمة في استقطاب الكوادر التعليمية، حيث نضم فقط الصفوة من خريجي الأزهر الشريف والجامعات الإسلامية الكبرى، ممن يحملون إجازات قرآنية معتمدة ومتصلة بالسند النبوي الشريف ﷺ.
                </p>
              </div>
            </div>

            {/* كارد Bento 2: مربع (الخصوصية) */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-[#110531] to-[#1a0944] border border-purple-950/50 flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <h4 className="font-bold text-base text-white">خصوصية تامة وبيئة آمنة</h4>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  فصول مستقلة بالكامل للنساء والأطفال لضمان أقصى درجات الأريحية والأمان أثناء التلقي.
                </p>
              </div>
            </div>

            {/* كارد Bento 3: مربع (التقارير) */}
            <div className="p-8 rounded-2xl bg-gradient-to-tr from-[#110531] to-[#15063b] border border-purple-950/50 flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[#e3be5a]">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <h4 className="font-bold text-base text-white">لوحة تحكم ومتابعة ذكية</h4>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  تقارير أداء دورية تصل لأولياء الأمور لتقييم الحفظ والالتزام بالخطة الزمنية أولاً بأول.
                </p>
              </div>
            </div>

            {/* كارد Bento 4: عريض (المرونة) */}
            <div className="md:col-span-2 p-8 rounded-2xl bg-[#110531] border border-purple-950/50 flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-400">
                  <HeartHandshake className="w-5 h-5 flex-shrink-0" />
                  <h4 className="font-bold text-lg text-white">مرونة زمنية مطلقة تناسب جدولك</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  نعمل على مدار الساعة لتغطية كافة النطاقات الزمنية حول العالم، مما يتيح لك ولأطفالك اختيار الأوقات الأكثر ملاءمة دون تعارض مع الدراسة أو العمل.
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* ================= القسم الرابع: الـ Ultimate Call To Action ================= */}
        <section className="relative rounded-2xl p-12 bg-gradient-to-r from-[#17083d] to-[#0d0426] border border-purple-900/20 text-center overflow-hidden shadow-2xl">
          <div className="absolute -right-20 -bottom-20 w-60 h-60 rounded-full bg-purple-600/5 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-xl mx-auto space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-white font-heading">ابدأ معاهدة القرآن برعاية تامة</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              احجز جلستك التقييمية المجانية الآن ليقوم أحد مشرفينا بتحديد مستواك الحالي واختيار المسار المناسب لك.
            </p>
            <div className="pt-2">
              <Link 
                to={ROUTES.REGISTER} 
                className="inline-flex items-center justify-center gap-3 font-bold px-10 py-4 rounded-xl bg-[#e3be5a] hover:bg-[#d4b04d] text-[#0b031e] transition-all duration-300 transform hover:scale-[1.02] shadow-xl shadow-amber-500/5 group"
              >
                <span>ابدأ جلستك التجريبية مجاناً</span>
                <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1.5" />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}