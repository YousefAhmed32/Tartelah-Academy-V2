import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import api from '../../utils/api.js'
import { ROUTES } from '../../config/constants.js'
import { resolveTeacherIdentity, handleAvatarError } from '../../utils/teacherIdentity.js'
import ErrorState from '../../components/shared/ErrorState.jsx'

export default function TeacherProfilePage() {
  const { id } = useParams()

  const { data: teacher, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['public', 'teacher', id],
    queryFn: () => api.get(`/teachers/public/${id}`).then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  return (
    <div dir="rtl">
      <section className="bg-page-dark pt-[clamp(120px,16vw,168px)] pb-10 px-[clamp(24px,6vw,80px)]">
        <div className="max-w-[880px] mx-auto">
          <Link to={ROUTES.TEACHERS} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-textWhite/70 hover:text-brand-gold transition-colors">
            <ChevronRight size={16} />
            كل المعلمين
          </Link>
        </div>
      </section>

      <section className="bg-[#FAF7F2] py-12 px-[clamp(24px,6vw,80px)] min-h-[50vh]">
        <div className="max-w-[880px] mx-auto">
          {isLoading ? (
            <div className="card-light p-8 animate-pulse" aria-busy="true" aria-label="جارٍ تحميل بيانات المعلم">
              <div className="flex items-start gap-5 mb-6">
                <div className="w-28 h-28 rounded-full bg-gray-100 flex-none" />
                <div className="flex-1 pt-2 space-y-3">
                  <div className="h-5 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-4 bg-gray-100 rounded-full w-1/3" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded-full w-full" />
                <div className="h-3 bg-gray-100 rounded-full w-full" />
                <div className="h-3 bg-gray-100 rounded-full w-2/3" />
              </div>
            </div>
          ) : isError || !teacher ? (
            <ErrorState
              title="تعذّر العثور على هذا المعلم"
              description="ربما تم إلغاء نشر هذا الملف أو حدث خطأ في الاتصال بالخادم."
              onRetry={refetch}
              isRetrying={isFetching}
            />
          ) : (
            <TeacherProfileContent teacher={teacher} />
          )}
        </div>
      </section>
    </div>
  )
}

function TeacherProfileContent({ teacher }) {
  const fullName = `${teacher.firstNameAr || ''} ${teacher.lastNameAr || ''}`.trim()
  const identity = resolveTeacherIdentity(teacher)
  const displayName = identity.honorificAr ? `${identity.honorificAr} ${fullName}` : fullName
  const registerHref = `${ROUTES.REGISTER}?teacherId=${teacher._id}&teacherName=${encodeURIComponent(fullName)}`

  return (
    <div className="card-light p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-right mb-6">
        <img
          src={identity.displayAvatar}
          alt=""
          aria-hidden="true"
          onError={(e) => handleAvatarError(e, identity)}
          className="w-28 h-28 rounded-full object-cover flex-none ring-4 ring-brand-gold/40 shadow-md bg-brand-light3"
        />
        <div className="min-w-0">
          <h1 className="font-heading font-extrabold text-2xl text-brand-textBody mb-1.5">{displayName}</h1>
          {!identity.isResolved && (
            <p className="text-xs font-semibold text-gray-400 mb-1.5">معلم قرآن كريم</p>
          )}
          {teacher.specialization && <span className="pill-purple">{teacher.specialization}</span>}
        </div>
      </div>

      {teacher.bioAr && (
        <div className="pt-6 border-t border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">السيرة والمؤهلات</h2>
          <p className="text-[15px] leading-relaxed text-brand-textBody/85 whitespace-pre-line">{teacher.bioAr}</p>
        </div>
      )}

      <div className="pt-6 mt-6 border-t border-gray-100">
        <Link to={registerHref} className="btn-purple block text-center w-full sm:w-auto sm:inline-block">
          سجّل الآن مع {identity.honorificAr || ''} {fullName}
        </Link>
      </div>
    </div>
  )
}
