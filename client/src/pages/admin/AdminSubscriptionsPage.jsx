import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Edit2, Plus, Calendar, RefreshCw, Search } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import { formatDateAr } from '../../utils/date.js'
import { getFileUrl } from '../../config/constants.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

const STATUS_CONFIG = {
  active:    { label: 'نشط',    badge: 'success' },
  expired:   { label: 'منتهي',  badge: 'gray' },
  cancelled: { label: 'ملغى',   badge: 'danger' },
  paused:    { label: 'موقوف',  badge: 'warning' },
  pending:   { label: 'معلق',   badge: 'purple' },
}

// ── Adjust Subscription Modal ─────────────────────────────────────────────────

function AdjustModal({ sub, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    status: sub.status,
    sessionsRemaining: sub.sessionsRemaining || 0,
    endDate: sub.endDate ? sub.endDate.slice(0, 10) : '',
    notes: sub.notes || '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mut = useMutation({
    mutationFn: (data) => api.patch(`/subscriptions/${sub._id}`, data).then(r => r.data),
    onSuccess: () => {
      toast.success('تم تحديث الاشتراك')
      qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const handleSave = () => {
    const updates = {
      status: form.status,
      sessionsRemaining: Number(form.sessionsRemaining),
      notes: form.notes,
    }
    if (form.endDate) updates.endDate = new Date(form.endDate).toISOString()
    mut.mutate(updates)
  }

  return (
    <Modal open onClose={onClose} title="تعديل الاشتراك" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button variant="purple" onClick={handleSave} loading={mut.isPending}>حفظ</Button>
      </>}>
      <div className="space-y-4" dir="rtl">
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="font-semibold text-gray-900">{sub.studentId?.firstNameAr} {sub.studentId?.lastNameAr}</div>
          <div className="text-xs text-gray-500 mt-0.5">{sub.packageId?.nameAr}</div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">الحالة</label>
          <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">الحصص المتبقية</label>
          <div className="flex items-center gap-2">
            <button onClick={() => set('sessionsRemaining', Math.max(0, form.sessionsRemaining - 1))}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-lg transition-colors flex-none flex items-center justify-center">−</button>
            <input type="number" min="0" className={`${inputCls} text-center`} value={form.sessionsRemaining} onChange={e => set('sessionsRemaining', e.target.value)} />
            <button onClick={() => set('sessionsRemaining', form.sessionsRemaining + 1)}
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-lg transition-colors flex-none flex items-center justify-center">+</button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">تاريخ الانتهاء</label>
          <input type="date" className={inputCls} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات</label>
          <textarea className={`${inputCls} h-16 resize-none py-2`} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات داخلية..." />
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSubscriptionsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [adjustSub, setAdjustSub] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({ studentId: '', packageId: '', startDate: '', teacherId: '', notes: '', sessionsRemaining: 0, amountPaid: 0 })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscriptions', page, statusFilter, search],
    queryFn: () => api.get(`/subscriptions?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`).then(r => r.data),
    placeholderData: (prev) => prev,
  })

  // Distinct query keys from AdminSessionsPage's ['admin','students'/'teachers','all'] — that page's
  // queryFn caches the full paginated envelope, not the array; sharing a key across differently-shaped
  // queryFns caused this page's `.map()` to crash whenever the sessions page's cache entry won the race.
  const { data: students = [] } = useQuery({ queryKey: ['admin', 'students', 'forSubscriptionForm'], queryFn: () => api.get('/admin/students?limit=200').then(r => r.data.data) })
  const { data: teachers = [] } = useQuery({ queryKey: ['admin', 'teachers', 'forSubscriptionForm'], queryFn: () => api.get('/admin/teachers?limit=100').then(r => r.data.data) })
  const { data: packages = [] } = useQuery({ queryKey: ['packages'], queryFn: () => api.get('/packages').then(r => r.data.data) })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/subscriptions', data),
    onSuccess: () => {
      toast.success('تم إنشاء الاشتراك')
      qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
      setShowCreate(false)
      setForm({ studentId: '', packageId: '', startDate: '', teacherId: '', notes: '', sessionsRemaining: 0, amountPaid: 0 })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const subs = data?.data || []

  const tabs = [
    { key: '', label: 'الكل' },
    { key: 'active', label: 'نشط' },
    { key: 'paused', label: 'موقوف' },
    { key: 'expired', label: 'منتهي' },
    { key: 'cancelled', label: 'ملغى' },
  ]

  return (
    <div dir="rtl">
      <PageHeader title="الاشتراكات" subtitle={`${data?.total || 0} اشتراك`}
        actions={<Button variant="purple" onClick={() => setShowCreate(true)}><Plus size={14} className="ml-1" /> اشتراك جديد</Button>} />

      {/* Search + Status tabs */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#c0b4de]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث باسم الطالب أو بريده..."
            className="w-full h-9 bg-white border border-[#e8e0f5] rounded-xl pr-9 pl-3 text-sm text-brand-textBody placeholder-[#c0b4de] outline-none focus:border-brand-purple/40 transition-all" dir="rtl" />
        </div>
        <div className="flex gap-1 p-1 bg-[#f0ecf8] rounded-xl w-fit">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setStatusFilter(t.key); setPage(1) }}
              className={`px-4 py-1.5 rounded-[10px] text-sm font-semibold transition-all ${statusFilter === t.key ? 'bg-white text-brand-textBody shadow-sm' : 'text-[#9b7fd6] hover:text-brand-textBody'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          <div className="card-light overflow-hidden">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-[#f0ecf8]">
                  {['الطالب', 'الباقة', 'المعلم', 'الانتهاء', 'الحصص المتبقية', 'الحالة', ''].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#9b7fd6] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => {
                  const sc = STATUS_CONFIG[sub.status] || { label: sub.status, badge: 'gray' }
                  const daysLeft = sub.endDate ? Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0
                  const isExpiringSoon = sub.status === 'active' && daysLeft <= 7 && daysLeft > 0
                  return (
                    <tr key={sub._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar src={getFileUrl(sub.studentId?.avatar)} firstName={sub.studentId?.firstNameAr} lastName={sub.studentId?.lastNameAr} size="xs" />
                          <span className="text-sm font-semibold text-brand-textBody">{sub.studentId?.firstNameAr} {sub.studentId?.lastNameAr}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-brand-textBody">{sub.packageId?.nameAr}</td>
                      <td className="px-4 py-3 text-sm text-[#9b7fd6]">{sub.teacherId?.firstNameAr || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[#9b7fd6]">{formatDateAr(sub.endDate)}</div>
                        {isExpiringSoon && (
                          <div className="text-xs text-amber-600 font-semibold mt-0.5">{daysLeft} أيام للانتهاء</div>
                        )}
                        {daysLeft <= 0 && sub.status === 'active' && (
                          <div className="text-xs text-red-500 font-semibold mt-0.5">منتهي الصلاحية</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${sub.sessionsRemaining <= 2 ? 'text-amber-600' : 'text-brand-textBody'}`}>
                          {sub.sessionsRemaining || 0} حصص
                        </span>
                      </td>
                      <td className="px-4 py-3"><Badge variant={sc.badge}>{sc.label}</Badge></td>
                      <td className="px-4 py-3">
                        <button onClick={() => setAdjustSub(sub)}
                          className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors">
                          <Edit2 size={12} /> تعديل
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!subs.length && (
              <EmptyState
                icon={<RefreshCw size={26} strokeWidth={1.6} />}
                title={search || statusFilter ? 'لا توجد نتائج مطابقة' : 'لا توجد اشتراكات بعد'}
                description={search || statusFilter ? 'جرّب تعديل البحث أو الفلتر' : 'ستظهر هنا الاشتراكات فور إنشائها'}
              />
            )}
          </div>
          {data?.totalPages > 1 && <div className="mt-4 flex justify-center"><Pagination current={page} total={data.totalPages} onChange={setPage} /></div>}
        </>
      )}

      {/* Adjust Modal */}
      {adjustSub && <AdjustModal sub={adjustSub} onClose={() => setAdjustSub(null)} />}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إنشاء اشتراك جديد" size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button variant="purple" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>إنشاء</Button>
        </>}>
        <div className="space-y-4" dir="rtl">
          <div>
            <label className="block text-xs font-semibold text-brand-textBody mb-1">الطالب *</label>
            <select value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} className="field-light w-full">
              <option value="">اختر طالباً</option>
              {students.map(s => <option key={s._id} value={s._id}>{s.firstNameAr} {s.lastNameAr}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-textBody mb-1">الباقة *</label>
            <select value={form.packageId} onChange={e => setForm(p => ({ ...p, packageId: e.target.value }))} className="field-light w-full">
              <option value="">اختر باقة</option>
              {packages.map(p => <option key={p._id} value={p._id}>{p.nameAr} — {p.price}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-textBody mb-1">المعلم</label>
            <select value={form.teacherId} onChange={e => setForm(p => ({ ...p, teacherId: e.target.value }))} className="field-light w-full">
              <option value="">اختر معلماً</option>
              {teachers.map(t => <option key={t._id} value={t._id}>{t.firstNameAr} {t.lastNameAr}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-brand-textBody mb-1">تاريخ البدء</label>
              <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="field-light w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-textBody mb-1">المبلغ المدفوع</label>
              <input type="number" value={form.amountPaid} onChange={e => setForm(p => ({ ...p, amountPaid: e.target.value }))} className="field-light w-full" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-textBody mb-1">الحصص المتاحة</label>
            <input type="number" value={form.sessionsRemaining} onChange={e => setForm(p => ({ ...p, sessionsRemaining: e.target.value }))} className="field-light w-full" placeholder="عدد الحصص" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
