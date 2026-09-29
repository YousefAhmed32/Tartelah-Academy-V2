import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr } from '../../utils/date.js'
import { supervisionService } from '../../services/supervision.service.js'

const SURAH_NAMES = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه']

function useProgress() {
  const mem = useQuery({ queryKey: ['memorization', 'me'], queryFn: () => api.get('/memorization/student/me').then(r => r.data.data), placeholderData: [] })
  const rev = useQuery({ queryKey: ['revision', 'me'], queryFn: () => api.get('/revision/student/me').then(r => r.data.data), placeholderData: [] })
  return { memorization: mem.data || [], revision: rev.data || [], isLoading: mem.isLoading || rev.isLoading }
}

export default function StudentProgressPage() {
  const { memorization, revision, isLoading } = useProgress()
  const plans = useQuery({ queryKey: ['student', 'academic-plans'], queryFn: () => supervisionService.academicPlans({ limit: 30 }) })

  const qualityColor = { excellent: '#22c55e', good: '#7c3aed', fair: '#f59e0b', weak: '#ef4444' }
  const qualityLabel = { excellent: 'ممتاز', good: 'جيد', fair: 'مقبول', weak: 'ضعيف' }

  return (
    <div dir="rtl">
      <PageHeader title="المستويات والتقدم" subtitle="متابعة الحفظ والمراجعة" />
      <section className="card-light mb-6 p-6">
        <h2 className="font-heading text-lg font-bold text-brand-textBody">خطتي التعليمية</h2>
        {plans.isLoading && <p className="mt-3 text-sm text-gray-500">جارٍ تحميل الخطة...</p>}
        {plans.isError && <p role="alert" className="mt-3 text-sm text-red-700">تعذر تحميل الخطة التعليمية</p>}
        {!plans.isLoading && !plans.isError && !plans.data?.data?.length && <p className="mt-3 text-sm text-gray-500">لم تُنشر خطة تعليمية لك بعد</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-2">{(plans.data?.data || []).map((plan) => <article key={plan._id} className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4"><h3 className="font-bold text-violet-950">{plan.courseId?.nameAr || plan.subjectKey} · {plan.level}</h3><p className="mt-2 text-sm text-gray-700">الهدف: {plan.goal}</p><p className="mt-1 text-sm text-gray-700">القادم: {plan.nextStep || 'سيحدده الإشراف'}</p><div className="mt-3 space-y-2">{plan.milestones?.map((step) => <div key={step._id} className="rounded-xl bg-white p-3 text-sm"><span className="font-semibold">{step.title}</span><span className="mr-2 text-xs text-gray-500">{step.status === 'completed' ? 'منجز' : step.status === 'in_progress' ? 'قيد العمل' : 'مخطط'}</span>{step.externalTest?.testedAt && <p className="mt-1 text-xs text-emerald-700">نتيجة الاختبار: {step.externalTest.result}</p>}</div>)}</div><div className="mt-3 flex flex-wrap gap-2">{plan.materialLinks?.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-violet-700 underline">{link.title}</a>)}</div></article>)}</div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Memorization */}
          <div className="card-light p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-brand-textBody text-lg">سجل الحفظ</h2>
              <span className="pill pill-purple">{memorization.length} سجل</span>
            </div>
            {!memorization.length ? (
              <div className="text-center py-8 text-[#7c6aaa] text-sm">لا يوجد سجل حفظ حتى الآن</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scroll">
                {memorization.map((r) => (
                  <div key={r._id} className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f5ff]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-brand-purple bg-white text-sm flex-none">
                      {r.surahNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-brand-textBody text-sm">{SURAH_NAMES[r.surahNumber - 1] || `سورة ${r.surahNumber}`}</div>
                      <div className="text-xs text-[#7c6aaa]">آية {r.fromAyah} - {r.toAyah}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold" style={{ color: qualityColor[r.quality] }}>{qualityLabel[r.quality]}</span>
                      <span className="text-xs text-[#7c6aaa]">{formatDateAr(r.recordedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revision */}
          <div className="card-light p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-brand-textBody text-lg">سجل المراجعة</h2>
              <span className="pill pill-success">{revision.length} سجل</span>
            </div>
            {!revision.length ? (
              <div className="text-center py-8 text-[#7c6aaa] text-sm">لا يوجد سجل مراجعة حتى الآن</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scroll">
                {revision.map((r) => (
                  <div key={r._id} className="flex items-center gap-3 p-3 rounded-xl bg-[#f0fdf4]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-emerald-600 bg-white text-sm flex-none">
                      {r.surahNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-brand-textBody text-sm">{SURAH_NAMES[r.surahNumber - 1] || `سورة ${r.surahNumber}`}</div>
                      <div className="text-xs text-[#7c6aaa]">آية {r.fromAyah} - {r.toAyah}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold" style={{ color: qualityColor[r.quality] }}>{qualityLabel[r.quality]}</span>
                      <span className="text-xs text-[#7c6aaa]">{formatDateAr(r.recordedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
