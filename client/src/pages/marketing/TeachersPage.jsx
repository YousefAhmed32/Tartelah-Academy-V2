import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api.js'
import TeacherCard from '../../components/marketing/TeacherCard.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'

const FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'male', label: 'معلمون' },
  { value: 'female', label: 'معلمات' },
]

function FilterControl({ value, onChange }) {
  return (
    <div role="group" aria-label="تصفية المعلمين حسب الفئة" className="flex items-center gap-1 p-1 bg-[#f3eefc] rounded-full flex-wrap">
      {FILTERS.map(f => (
        <button
          key={f.value}
          type="button"
          aria-pressed={value === f.value}
          onClick={() => onChange(f.value)}
          className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
            value === f.value ? 'bg-brand-purple text-white shadow-purple-sm' : 'text-brand-textBody/70 hover:text-brand-purple'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

function TeacherCardSkeleton() {
  return (
    <div className="card-light flex flex-col h-full p-6 animate-pulse" aria-hidden="true">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex-none" />
        <div className="flex-1 pt-2 space-y-2">
          <div className="h-4 bg-gray-100 rounded-full w-3/4" />
          <div className="h-3 bg-gray-100 rounded-full w-1/2" />
        </div>
      </div>
      <div className="h-6 w-28 bg-gray-100 rounded-full mb-4" />
      <div className="space-y-2 mb-5 flex-1">
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-2/3" />
      </div>
      <div className="h-10 bg-gray-100 rounded-full" />
    </div>
  )
}

export default function TeachersPage() {
  const [genderFilter, setGenderFilter] = useState('all')

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['public', 'teachers', genderFilter],
    queryFn: () => api.get('/teachers/public', {
      params: { limit: 24, ...(genderFilter !== 'all' ? { gender: genderFilter } : {}) },
    }).then(r => r.data.data),
    staleTime: 1000 * 60 * 5,
  })

  const teachers = data?.teachers || []
  const total = data?.total ?? 0

  return (
    <div dir="rtl">
      {/* ═══ Hero — solid brand-dark surface, no fragile height-dependent gradient ═══ */}
      <section className="bg-page-dark pt-[clamp(120px,16vw,168px)] pb-14 md:pb-20 px-[clamp(24px,6vw,80px)]">
        <div className="max-w-[1280px] mx-auto text-center">
          <span className="text-xs font-bold tracking-widest text-brand-gold uppercase mb-3 block">
            مِنصة ترتيلة التعليمية
          </span>
          <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.2] mb-4">
            خيرة معلمي ومقرئي القرآن
          </h1>
          <div className="h-[2px] w-20 bg-gradient-to-r from-transparent via-brand-gold to-transparent mx-auto mb-6" />
          <p className="text-base text-brand-textWhite/80 max-w-xl mx-auto leading-relaxed">
            نخبة من الأساتذة والأستاذات المتخصصين والمجازين، تصفح ملفاتهم واختر معلمك وابدأ رحلتك القرآنية الآن.
          </p>
        </div>
      </section>

      {/* ═══ Discovery — its own light surface; boundary never depends on card-grid height ═══ */}
      <section className="bg-[#FAF7F2] py-12 md:py-16 px-[clamp(24px,6vw,80px)]">
        <div className="max-w-[1280px] mx-auto">

          <div className="card-light flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mb-10">
            <p className="text-sm font-semibold text-gray-500">
              {isLoading ? 'جارٍ التحميل…' : isError ? '—' : `${total} من نخبة معلمي القرآن الكريم`}
            </p>
            <FilterControl value={genderFilter} onChange={setGenderFilter} />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6" aria-busy="true" aria-label="جارٍ تحميل بيانات المعلمين">
              {[1, 2, 3, 4, 5, 6].map(i => <TeacherCardSkeleton key={i} />)}
            </div>
          ) : isError ? (
            <ErrorState
              title="تعذّر تحميل بيانات المعلمين"
              description="حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى."
              onRetry={refetch}
              isRetrying={isFetching}
            />
          ) : teachers.length === 0 ? (
            genderFilter === 'all' ? (
              <EmptyState
                title="لا يوجد معلمون منشورون حالياً"
                description="يرجى المحاولة لاحقاً."
              />
            ) : (
              <EmptyState
                title="لا يوجد نتائج ضمن هذا التصنيف"
                description={`لا يوجد حالياً ${genderFilter === 'male' ? 'معلمون' : 'معلمات'} منشورون. يمكنك استعراض جميع المعلمين بدلاً من ذلك.`}
                action={{ label: 'عرض جميع المعلمين', onClick: () => setGenderFilter('all') }}
              />
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 items-stretch">
              {teachers.map(t => <TeacherCard key={t._id} teacher={t} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
