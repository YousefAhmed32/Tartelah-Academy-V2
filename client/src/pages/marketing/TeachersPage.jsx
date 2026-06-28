import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../config/constants.js'
import api from '../../utils/api.js'
import { getFileUrl } from '../../config/constants.js'

const FALLBACK_TEACHERS = [
  { _id: '1', firstNameAr: 'محمد', lastNameAr: 'الأحمدي', specialization: 'تجويد وحفظ القراءات العشر', bioAr: 'خريج كلية القرآن الكريم بالمدينة المنورة، مجاز بالروايات المتواترة، خبرة ١٥ عاماً في التأهيل والتحفيظ الأكاديمي والتدريس أونلاين.' },
  { _id: '2', firstNameAr: 'فاطمة', lastNameAr: 'العمري', specialization: 'إجازة وتجويد للنساء والأطفال', bioAr: 'حافظة لكتاب الله ومجازة برواية حفص وشعبة، متخصصة في ضبط مخارج الحروف وتأسيس الأجيال الناشئة بأساليب حديثة.' },
  { _id: '3', firstNameAr: 'علي', lastNameAr: 'الحسن', specialization: 'التجويد المتقدم والمتون العلمية', bioAr: 'مدرس متون الجزرية والتحفة، يمتلك أسلوباً دقيقاً في شرح أحكام التلاوة وتصحيح المسارات القرآنيّة والمخارج.' },
  { _id: '4', firstNameAr: 'سارة', lastNameAr: 'الزهراني', specialization: 'التلاوة والتدبر الموجه', bioAr: 'حاصلة على ماجستير في علوم التفسير، تجمع بين جودة التلاوة وربط الآيات بالمعاني والتدبر الإيماني المعاصر.' },
]

function TeacherCard({ teacher }) {
  const fullName = `${teacher.firstNameAr || ''} ${teacher.lastNameAr || ''}`.trim()

  return (
    // الحاوية الأساسية للـ Flip (تأثير ثلاثي الأبعاد)
    <div className="group h-[400px] w-full [perspective:1000px]">
      <div className="relative h-full w-full rounded-2xl transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] shadow-sm hover:shadow-xl">
        
        {/* ================= الوجه الأمامي (FRONT) ================= */}
        <div className="absolute inset-0 h-full w-full rounded-2xl bg-white p-6 flex flex-col items-center justify-center text-center [backface-visibility:hidden] border border-gray-100">
          
          {/* إطار الصورة النيومودرن البنفسجي */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-purple-600/10 blur-md scale-110" />
            <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-purple-600 to-purple-400">
              {teacher.avatar ? (
                <img 
                  src={getFileUrl(teacher.avatar)} 
                  alt={fullName}
                  className="w-full h-full rounded-full object-cover object-top border-4 border-white" 
                />
              ) : (
                <div className="w-full h-full rounded-full bg-purple-50 flex items-center justify-center border-4 border-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14 text-purple-600/70">
                    <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.25a.75.75 0 0 0 1 .707A8.237 8.237 0 0 1 6 18.75c1.995 0 3.823.707 5.25 1.886V4.533ZM12.75 20.636A8.214 8.214 0 0 1 18 18.75c1.377 0 2.654.344 3.75.943a.75.75 0 0 0 1-.707V4.743a.75.75 0 0 0-.5-.707A9.735 9.735 0 0 0 18 3a9.707 9.707 0 0 0-5.25 1.533v16.103Z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* اسم المعلم بوقار وبساطة مودرن */}
          <h3 className="font-heading font-bold text-gray-900 text-2xl mb-2">
            فضيلة الشيخ {fullName}
          </h3>

          {/* تخصص خفيف ومحدد */}
          <p className="text-sm font-medium text-purple-600 bg-purple-50 px-4 py-1 rounded-full">
            {teacher.specialization || 'معلم قرآن كريم'}
          </p>
          
          {/* إشارة تلميح للمستخدم تفهمه إن الكارد بيلف */}
          <span className="absolute bottom-4 text-[11px] text-gray-400 flex items-center gap-1 opacity-60 group-hover:opacity-0 transition-opacity">
            المس الكارد للتفاصيل ↺
          </span>
        </div>

        {/* ================= الوجه الخلفي (BACK) ================= */}
        <div className="absolute inset-0 h-full w-full rounded-2xl bg-gradient-to-b from-purple-900 to-purple-950 p-8 flex flex-col justify-between text-center [transform:rotateY(180deg)] [backface-visibility:hidden] text-white">
          
          <div className="flex flex-col items-center flex-grow justify-center">
            {/* أيقونة مصحف صغيرة تؤكد الهوية في الخلف */}
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-purple-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>

            <h4 className="text-lg font-bold text-purple-200 mb-3">السيرة والمؤهلات</h4>
            
            {/* النص مضبوط المسافات تماماً لراحة القراءة */}
            <p className="text-sm leading-relaxed text-purple-100/90 font-light px-2 line-clamp-6">
              {teacher.bioAr || 'حافظ ومجاز في كتاب الله تعالى، يمتلك خبرة واسعة في تعليم أحكام التجويد والترتيل الصحيح لمختلف الأعمار.'}
            </p>
          </div>

          {/* زر الحجز المودرن الفخم */}
          <Link 
            to={ROUTES.REGISTER}
            className="block w-full py-3 rounded-xl text-sm font-bold bg-white text-purple-950 hover:bg-purple-100 transition-colors shadow-lg mt-4"
          >
            احجز حلقة الآن
          </Link>
        </div>

      </div>
    </div>
  )
}

export default function TeachersPage() {
  const { data: teachers, isLoading } = useQuery({
    queryKey: ['public', 'teachers'],
    queryFn: () => api.get('/admin/teachers?limit=20&isActive=true').then(r => r.data.data).catch(() => FALLBACK_TEACHERS),
    staleTime: 1000 * 60 * 5,
  })

  const displayTeachers = (!teachers || teachers.length === 0) ? FALLBACK_TEACHERS : teachers

return (
  /* التدرج اللوني الاحترافي: يبدأ بنفسجي حبري داكن جداً من الأعلى لإنقاذ النيفبار، وينزل بنعومة فائقة للأبيض الناصع */
  <div className="min-h-screen pt-36 pb-28 px-[clamp(24px,6vw,80px)] relative bg-gradient-to-b from-[#11052c] via-[#1a0b3e] via-30% to-white to-60%" dir="rtl">
    
    {/* تأثير ضوئي خفي يشبه الموجة النورانية خلف الهيدر الرئيسي */}
    <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-tr from-purple-600/10 via-transparent to-purple-800/5 blur-[120px] pointer-events-none" />

    <div className="max-w-[1280px] mx-auto relative z-10">
      
      {/* هيدر الصفحة بتناسق لوني مذهل: النصوص فوق الخلفية الغامقة تحولت لألوان مضيئة وفخمة */}
      <div className="text-center mb-24 relative">
        <span className="text-xs font-bold tracking-widest text-[#E8C76A] uppercase mb-3 block drop-shadow-sm">
          مِنصة ترتيلة التعليمية
        </span>
        <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.2] mb-4 drop-shadow-md">
          خيرة معلمي ومقرئي القرآن
        </h1>
        <div className="h-[2px] w-20 bg-gradient-to-r from-transparent via-[#E8C76A] to-transparent mx-auto mb-6" />
        <p className="text-base text-purple-200/80 max-w-xl mx-auto font-normal leading-relaxed">
          نخبة من الأساتذة المتخصصين والمجازين، تصفح سيرتهم واختر معلمك وابدأ رحلتك القرآنية الآن.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl h-[400px] animate-pulse bg-purple-950/5 border border-purple-900/10" />
          ))}
        </div>
      ) : (
        /* الكروت مصفوفة في منطقة البياض الناصع تماماً، مما يمنحها بروزاً خرافياً */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
          {displayTeachers.map((t) => (
            <TeacherCard key={t._id} teacher={t} />
          ))}
        </div>
      )}
    </div>
  </div>
)
}