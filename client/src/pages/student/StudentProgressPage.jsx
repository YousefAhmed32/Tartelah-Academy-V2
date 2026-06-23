import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Badge from '../../components/ui/Badge.jsx'
import { formatDateAr } from '../../utils/date.js'

const SURAH_NAMES = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه']

function useProgress() {
  const mem = useQuery({ queryKey: ['memorization', 'me'], queryFn: () => api.get('/memorization/student/me').then(r => r.data.data), placeholderData: [] })
  const rev = useQuery({ queryKey: ['revision', 'me'], queryFn: () => api.get('/revision/student/me').then(r => r.data.data), placeholderData: [] })
  return { memorization: mem.data || [], revision: rev.data || [], isLoading: mem.isLoading || rev.isLoading }
}

export default function StudentProgressPage() {
  const { memorization, revision, isLoading } = useProgress()

  const qualityColor = { excellent: '#22c55e', good: '#7c3aed', fair: '#f59e0b', weak: '#ef4444' }
  const qualityLabel = { excellent: 'ممتاز', good: 'جيد', fair: 'مقبول', weak: 'ضعيف' }

  return (
    <div dir="rtl">
      <PageHeader title="المستويات والتقدم" subtitle="متابعة الحفظ والمراجعة" />

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
              <div className="text-center py-8 text-[#9b7fd6] text-sm">لا يوجد سجل حفظ حتى الآن</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scroll">
                {memorization.map((r) => (
                  <div key={r._id} className="flex items-center gap-3 p-3 rounded-xl bg-[#f8f5ff]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-brand-purple bg-white text-sm flex-none">
                      {r.surahNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-brand-textBody text-sm">{SURAH_NAMES[r.surahNumber - 1] || `سورة ${r.surahNumber}`}</div>
                      <div className="text-xs text-[#9b7fd6]">آية {r.fromAyah} - {r.toAyah}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold" style={{ color: qualityColor[r.quality] }}>{qualityLabel[r.quality]}</span>
                      <span className="text-xs text-[#9b7fd6]">{formatDateAr(r.recordedAt)}</span>
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
              <div className="text-center py-8 text-[#9b7fd6] text-sm">لا يوجد سجل مراجعة حتى الآن</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scroll">
                {revision.map((r) => (
                  <div key={r._id} className="flex items-center gap-3 p-3 rounded-xl bg-[#f0fdf4]">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-emerald-600 bg-white text-sm flex-none">
                      {r.surahNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-brand-textBody text-sm">{SURAH_NAMES[r.surahNumber - 1] || `سورة ${r.surahNumber}`}</div>
                      <div className="text-xs text-[#9b7fd6]">آية {r.fromAyah} - {r.toAyah}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-bold" style={{ color: qualityColor[r.quality] }}>{qualityLabel[r.quality]}</span>
                      <span className="text-xs text-[#9b7fd6]">{formatDateAr(r.recordedAt)}</span>
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
