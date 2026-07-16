import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Calendar, Clock, Edit2, Pause, Play, Link2, Trash2, PlusCircle } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx'
import { formatDateAr } from '../../utils/date.js'
import { getFileUrl, DAYS_OF_WEEK, SCHEDULE_FREQUENCY } from '../../config/constants.js'

const STATUS_CONFIG = {
  active: { label: 'نشط', badge: 'success' },
  paused: { label: 'موقوف', badge: 'warning' },
  ended: { label: 'منتهٍ', badge: 'gray' },
}

const FIELD = 'field-light w-full'

// ── Edit Modal — full admin authority: recurrence, reassignment, link, status ──

function EditRuleModal({ rule, teachers, students, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    status: rule.status,
    meetingLink: rule.meetingLink || '',
    endDate: rule.endDate ? rule.endDate.slice(0, 10) : '',
    notes: rule.notes || '',
    frequency: rule.frequency || 'weekly',
    daysOfWeek: rule.daysOfWeek || [],
    timeOfDay: rule.timeOfDay || '18:00',
    durationMinutes: rule.durationMinutes || 60,
    teacherId: rule.teacherId?._id || '',
    studentId: rule.studentId?._id || '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const toggleDay = (d) => setForm(p => ({
    ...p, daysOfWeek: p.daysOfWeek.includes(d) ? p.daysOfWeek.filter(x => x !== d) : [...p.daysOfWeek, d].sort(),
  }))

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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">المعلم</label>
            <select value={form.teacherId} onChange={e => set('teacherId', e.target.value)} className={FIELD}>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.firstNameAr} {t.lastNameAr}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">الطالب</label>
            <select value={form.studentId} onChange={e => set('studentId', e.target.value)} className={FIELD}>
              {students.map(s => <option key={s._id} value={s._id}>{s.firstNameAr} {s.lastNameAr}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">الحالة</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} className={FIELD}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">التكرار</label>
            <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className={FIELD}>
              {Object.entries(SCHEDULE_FREQUENCY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">مدة الحصة (دقيقة)</label>
            <input type="number" min={15} step={15} value={form.durationMinutes}
              onChange={e => set('durationMinutes', Number(e.target.value))} className={FIELD} />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">أيام الأسبوع</label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS_OF_WEEK.map(d => (
              <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={form.daysOfWeek.includes(d.value)
                  ? { background: 'rgba(124,58,237,0.15)', color: '#7c3aed', border: '1.5px solid #7c3aed' }
                  : { background: '#f9fafb', color: '#9ca3af', border: '1.5px solid transparent' }}>
                {d.short}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">وقت الحصة</label>
            <input type="time" value={form.timeOfDay} onChange={e => set('timeOfDay', e.target.value)} className={FIELD} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">تاريخ الانتهاء</label>
            <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={FIELD} />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">رابط الاجتماع</label>
          <input type="url" value={form.meetingLink} onChange={e => set('meetingLink', e.target.value)} className={FIELD} placeholder="https://zoom.us/j/..." />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={`${FIELD} h-16 resize-none py-2`} placeholder="ملاحظات..." />
        </div>
      </div>
    </Modal>
  )
}

// ── Generate More Modal ──────────────────────────────────────────────────────

function GenerateMoreModal({ rule, onClose }) {
  const qc = useQueryClient()
  const [sessionsTotal, setSessionsTotal] = useState('')
  const [endDate, setEndDate] = useState('')

  const mut = useMutation({
    mutationFn: () => api.post(`/admin/schedule-rules/${rule._id}/generate-more`, {
      sessionsTotal: sessionsTotal || undefined,
      endDate: endDate || undefined,
    }).then(r => r.data),
    onSuccess: (res) => {
      toast.success(res.message || 'تم توليد حصص إضافية')
      qc.invalidateQueries({ queryKey: ['admin', 'schedule-rules'] })
      onClose()
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <Modal open onClose={onClose} title="توليد حصص إضافية" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button variant="purple" onClick={() => mut.mutate()} loading={mut.isPending}>توليد</Button>
      </>}>
      <div className="space-y-4" dir="rtl">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">إجمالي عدد الحصص (اختياري)</label>
          <input type="number" min={1} value={sessionsTotal} onChange={e => setSessionsTotal(e.target.value)} className={FIELD} placeholder="مثال: 32" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">تاريخ انتهاء جديد (اختياري)</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={FIELD} />
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
  const [generateRule, setGenerateRule] = useState(null)
  const [deleteRule, setDeleteRule] = useState(null)
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

  const { data: students = [] } = useQuery({
    queryKey: ['admin', 'students', 'all'],
    queryFn: () => api.get('/admin/students?limit=200').then(r => r.data.data),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/admin/schedule-rules/${id}`, { status }).then(r => r.data),
    onSuccess: () => { toast.success('تم تحديث الحالة'); qc.invalidateQueries({ queryKey: ['admin', 'schedule-rules'] }) },
    onError: () => toast.error('حدث خطأ'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/admin/schedule-rules/${id}`).then(r => r.data),
    onSuccess: () => { toast.success('تم حذف الجدول'); qc.invalidateQueries({ queryKey: ['admin', 'schedule-rules'] }); setDeleteRule(null) },
    onError: (e) => toast.error(e?.response?.data?.message || 'حدث خطأ'),
  })

  const rules = data?.data || []

  const tabs = [
    { key: '', label: 'الكل' },
    { key: 'active', label: 'نشط' },
    { key: 'paused', label: 'موقوف' },
    { key: 'ended', label: 'منتهٍ' },
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
              const days = rule.daysOfWeek?.map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label || d).join('، ')
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
                      <span className="flex items-center gap-1"><Clock size={11} /> {rule.timeOfDay}</span>
                      {rule.endDate && <span>حتى: {formatDateAr(rule.endDate)}</span>}
                      {rule.durationMinutes && <span>{rule.durationMinutes} دقيقة</span>}
                      {rule.stats && <span>{rule.stats.completed}/{rule.stats.total} حصة مكتملة</span>}
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
                    <button onClick={() => setGenerateRule(rule)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors">
                      <PlusCircle size={11} /> توليد
                    </button>
                    <button onClick={() => setEditRule(rule)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors">
                      <Edit2 size={11} /> تعديل
                    </button>
                    <button onClick={() => setDeleteRule(rule)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                      <Trash2 size={11} /> حذف
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

      {editRule && <EditRuleModal rule={editRule} teachers={teachers} students={students} onClose={() => setEditRule(null)} />}
      {generateRule && <GenerateMoreModal rule={generateRule} onClose={() => setGenerateRule(null)} />}
      <ConfirmDialog
        open={!!deleteRule}
        onClose={() => setDeleteRule(null)}
        onConfirm={() => deleteMut.mutate(deleteRule._id)}
        loading={deleteMut.isPending}
        title="حذف قاعدة الجدول"
        message="سيتم حذف هذا الجدول وكل الحصص القادمة غير المكتملة المرتبطة به. الحصص السابقة تبقى محفوظة في السجل. هل أنت متأكد؟"
        confirmLabel="حذف"
        variant="danger"
      />
    </div>
  )
}
