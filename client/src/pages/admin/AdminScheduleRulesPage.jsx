import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Calendar, Clock, Edit2, Pause, Play, Link2 } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr } from '../../utils/date.js'
import { getFileUrl } from '../../config/constants.js'

const DAY_NAMES_AR = { monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد' }

const STATUS_CONFIG = {
  active:    { label: 'نشط',    badge: 'success' },
  paused:    { label: 'موقوف',  badge: 'warning' },
  cancelled: { label: 'ملغى',   badge: 'danger' },
  completed: { label: 'مكتمل',  badge: 'gray' },
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditRuleModal({ rule, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    status: rule.status,
    meetingLink: rule.meetingLink || '',
    endDate: rule.endDate ? rule.endDate.slice(0, 10) : '',
    notes: rule.notes || '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mut = useMutation({
    mutationFn: (data) => api.patch(`/admin/schedule-rules/${rule._id}`, data).then(r => r.data),
    onSuccess: () => {
      toast.success('تم تحديث قاعدة الجدول')
      qc.invalidateQueries({ queryKey: ['admin', 'schedule-rules'] })
      onClose()
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <Modal open onClose={onClose} title="تعديل قاعدة الجدول" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button variant="purple" onClick={() => mut.mutate(form)} loading={mut.isPending}>حفظ</Button>
      </>}>
      <div className="space-y-4" dir="rtl">
        {/* Rule summary */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
          <div className="font-semibold text-gray-800">{rule.teacherId?.firstNameAr} {rule.teacherId?.lastNameAr}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {rule.studentId?.firstNameAr} {rule.studentId?.lastNameAr} ·{' '}
            {rule.dayOfWeek?.map(d => DAY_NAMES_AR[d]).join(', ')} ·{' '}
            {rule.startTime} – {rule.endTime}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">الحالة</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className="field-light w-full">
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">رابط الاجتماع</label>
          <input type="url" value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)} className="field-light w-full" placeholder="https://zoom.us/j/..." />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">تاريخ الانتهاء</label>
          <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className="field-light w-full" />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className="field-light w-full h-16 resize-none py-2" placeholder="ملاحظات..." />
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminScheduleRulesPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [editRule, setEditRule] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'schedule-rules', page, statusFilter, teacherFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 20 })
      if (statusFilter) params.set('status', statusFilter)
      if (teacherFilter) params.set('teacherId', teacherFilter)
      return api.get(`/admin/schedule-rules?${params}`).then(r => r.data)
    },
    placeholderData: (prev) => prev,
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin', 'teachers', 'all'],
    queryFn: () => api.get('/admin/teachers?limit=100').then(r => r.data.data),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/schedule-rules/${id}`, { status }).then(r => r.data),
    onSuccess: () => { toast.success('تم تحديث الحالة'); qc.invalidateQueries({ queryKey: ['admin', 'schedule-rules'] }) },
    onError: () => toast.error('حدث خطأ'),
  })

  const rules = data?.data || []

  const tabs = [
    { key: '', label: 'الكل' },
    { key: 'active', label: 'نشط' },
    { key: 'paused', label: 'موقوف' },
    { key: 'completed', label: 'مكتمل' },
    { key: 'cancelled', label: 'ملغى' },
  ]

  return (
    <div dir="rtl">
      <PageHeader title="جداول الحصص" subtitle={`${data?.total || 0} قاعدة جدول`} />

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1 p-1 bg-[#f0ecf8] rounded-xl">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setStatusFilter(t.key); setPage(1) }}
              className={`px-4 py-1.5 rounded-[10px] text-sm font-semibold transition-all ${statusFilter === t.key ? 'bg-white text-brand-textBody shadow-sm' : 'text-[#9b7fd6] hover:text-brand-textBody'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <select value={teacherFilter} onChange={e => { setTeacherFilter(e.target.value); setPage(1) }} className="field-light h-9 text-sm px-3">
          <option value="">كل المعلمين</option>
          {teachers.map(t => <option key={t._id} value={t._id}>{t.firstNameAr} {t.lastNameAr}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          <div className="space-y-3">
            {rules.map((rule) => {
              const sc = STATUS_CONFIG[rule.status] || { label: rule.status, badge: 'gray' }
              const days = rule.dayOfWeek?.map(d => DAY_NAMES_AR[d] || d).join('، ')
              const isActive = rule.status === 'active'

              return (
                <div key={rule._id} className="card-light p-4 flex flex-wrap items-center gap-4">
                  {/* Teacher avatar */}
                  <Avatar src={getFileUrl(rule.teacherId?.avatar)} firstName={rule.teacherId?.firstNameAr} lastName={rule.teacherId?.lastNameAr} size="sm" />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-brand-textBody">
                        {rule.teacherId?.firstNameAr} {rule.teacherId?.lastNameAr}
                      </span>
                      <span className="text-[#9b7fd6] text-sm">→</span>
                      <span className="text-sm text-brand-textBody">
                        {rule.studentId?.firstNameAr} {rule.studentId?.lastNameAr}
                      </span>
                      <Badge variant={sc.badge}>{sc.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9b7fd6]">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {days}</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {rule.startTime} – {rule.endTime}</span>
                      {rule.endDate && <span>حتى: {formatDateAr(rule.endDate)}</span>}
                      {rule.duration && <span>{rule.duration} دقيقة</span>}
                    </div>
                    {rule.meetingLink && (
                      <a href={rule.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-500 hover:underline mt-1 block truncate max-w-xs">
                        <Link2 size={12} strokeWidth={2} className="inline-block ml-1" />{rule.meetingLink}
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleMut.mutate({ id: rule._id, status: isActive ? 'paused' : 'active' })}
                      disabled={toggleMut.isPending}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {isActive ? <><Pause size={11} /> إيقاف</> : <><Play size={11} /> تفعيل</>}
                    </button>
                    <button onClick={() => setEditRule(rule)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors">
                      <Edit2 size={11} /> تعديل
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {!rules.length && (
            <div className="card-light text-center py-16">
              <Calendar size={40} className="mx-auto mb-3 text-[#9b7fd6]" />
              <div className="text-[#9b7fd6] font-semibold">لا توجد جداول</div>
              <div className="text-sm text-[#9b7fd6] mt-1">يمكن إنشاء جداول من صفحة الحصص</div>
            </div>
          )}

          {data?.totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination current={page} total={data.totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}

      {editRule && <EditRuleModal rule={editRule} onClose={() => setEditRule(null)} />}
    </div>
  )
}
