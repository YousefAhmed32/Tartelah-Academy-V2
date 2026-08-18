import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Edit2, Plus, Calendar, RefreshCw, Search, Snowflake, Gift, Wallet } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import LessonTransactionTable from '../../components/shared/LessonTransactionTable.jsx'
import { formatDateAr } from '../../utils/date.js'
import { getFileUrl } from '../../config/constants.js'
import { QK } from '../../services/queryKeys.js'
import Can from '../../components/shared/Can.jsx'

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
  const studentId = sub.studentId?._id || sub.studentId
  const [form, setForm] = useState({
    status: sub.status,
    endDate: sub.endDate ? sub.endDate.slice(0, 10) : '',
    notes: sub.notes || '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [freezeReason, setFreezeReason] = useState('')
  const [compAmount, setCompAmount] = useState(1)
  const [compReason, setCompReason] = useState('')

  const { data: walletData } = useQuery({
    queryKey: QK.WALLET(studentId),
    queryFn: () => api.get(`/wallet/${studentId}`).then(r => r.data.data),
    enabled: !!studentId,
  })
  const { data: transactions } = useQuery({
    queryKey: QK.WALLET_TRANSACTIONS(studentId, { page: 1 }),
    queryFn: () => api.get(`/wallet/${studentId}/transactions?limit=10`).then(r => r.data.data.transactions),
    enabled: !!studentId,
  })

  const invalidateWallet = () => {
    qc.invalidateQueries({ queryKey: QK.WALLET(studentId) })
    qc.invalidateQueries({ queryKey: ['wallet', studentId, 'transactions'] })
    qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
  }

  const mut = useMutation({
    mutationFn: (data) => api.patch(`/subscriptions/${sub._id}`, data).then(r => r.data),
    onSuccess: () => {
      toast.success('تم تحديث الاشتراك')
      qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  // Manual lesson-balance adjustments now go through the wallet ledger
  // (POST /wallet/:studentId/adjust) instead of a raw PATCH to
  // Subscription.sessionsRemaining — every change is an auditable
  // LessonTransaction, never a silent number overwrite.
  const adjustWalletMut = useMutation({
    mutationFn: () => api.post(`/wallet/${studentId}/adjust`, { amount: Number(adjustAmount), reason: adjustReason }),
    onSuccess: () => {
      toast.success('تم تعديل رصيد الحصص')
      setAdjustAmount(''); setAdjustReason('')
      invalidateWallet()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const freezeMut = useMutation({
    mutationFn: () => api.post(`/wallet/${studentId}/freeze`, { reason: freezeReason }),
    onSuccess: () => { toast.success('تم تجميد المحفظة'); setFreezeReason(''); invalidateWallet() },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })
  const resumeMut = useMutation({
    mutationFn: () => api.post(`/wallet/${studentId}/resume`),
    onSuccess: () => { toast.success('تم إلغاء تجميد المحفظة'); invalidateWallet() },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })
  const compMut = useMutation({
    mutationFn: () => api.post(`/wallet/${studentId}/compensation`, { amount: Number(compAmount), reason: compReason }),
    onSuccess: () => {
      toast.success('تم منح الحصة التعويضية')
      setCompAmount(1); setCompReason('')
      invalidateWallet()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const handleSave = () => {
    const updates = { status: form.status, notes: form.notes }
    if (form.endDate) updates.endDate = new Date(form.endDate).toISOString()
    mut.mutate(updates)
  }

  const wallet = walletData

  return (
    <Modal open onClose={onClose} title="تعديل الاشتراك والمحفظة" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        <Button variant="purple" onClick={handleSave} loading={mut.isPending}>حفظ بيانات الاشتراك</Button>
      </>}>
      <div className="space-y-5" dir="rtl">
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
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">تاريخ الانتهاء</label>
          <input type="date" className={inputCls} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات</label>
          <textarea className={`${inputCls} h-16 resize-none py-2`} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات داخلية..." />
        </div>

        {/* ── Wallet management ── */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={15} className="text-violet-600" />
            <h4 className="font-bold text-sm text-gray-900">محفظة الحصص</h4>
            {wallet?.status === 'frozen' && <Badge variant="blue">مجمّدة</Badge>}
          </div>

          {wallet && (
            <div className="mb-4 p-3 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-between">
              <span className="text-xs text-violet-700 font-semibold">الرصيد الحالي</span>
              <span className="font-heading font-extrabold text-lg text-violet-900">{wallet.remaining ?? 0} حصة</span>
            </div>
          )}

          {/* Manual adjustment */}
          <div className="flex items-end gap-2 mb-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">تعديل الرصيد (+/-)</label>
              <input type="number" className={inputCls} value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="مثال: -2 أو 3" />
            </div>
            <div className="flex-[1.4]">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">السبب</label>
              <input className={inputCls} value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="سبب التعديل" />
            </div>
            <Button variant="outline" size="sm" disabled={!adjustAmount || !adjustReason.trim()} loading={adjustWalletMut.isPending}
              onClick={() => adjustWalletMut.mutate()}>تطبيق</Button>
          </div>

          {/* Freeze / resume */}
          {wallet?.status === 'frozen' ? (
            <div className="flex items-center justify-between mb-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-xs text-blue-700">{wallet.freezeReason || 'مجمّدة'}</span>
              <Button variant="outline" size="sm" loading={resumeMut.isPending} onClick={() => resumeMut.mutate()}>إلغاء التجميد</Button>
            </div>
          ) : (
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 mb-1.5 block">سبب التجميد (إجازة / رمضان / ظرف طبي...)</label>
                <input className={inputCls} value={freezeReason} onChange={e => setFreezeReason(e.target.value)} placeholder="السبب" />
              </div>
              <Button variant="outline" size="sm" icon={<Snowflake size={13} />} disabled={!freezeReason.trim()} loading={freezeMut.isPending}
                onClick={() => freezeMut.mutate()}>تجميد</Button>
            </div>
          )}

          {/* Compensation grant */}
          <div className="flex items-end gap-2 mb-4">
            <div className="w-20">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">عدد الحصص</label>
              <input type="number" min="1" className={`${inputCls} text-center`} value={compAmount} onChange={e => setCompAmount(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">سبب الحصة التعويضية</label>
              <input className={inputCls} value={compReason} onChange={e => setCompReason(e.target.value)} placeholder="السبب" />
            </div>
            <Button variant="outline" size="sm" icon={<Gift size={13} />} disabled={!compReason.trim()} loading={compMut.isPending}
              onClick={() => compMut.mutate()}>منح</Button>
          </div>

          {transactions && (
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2">آخر الحركات</div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100">
                <LessonTransactionTable transactions={transactions} />
              </div>
            </div>
          )}
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
        actions={<Can permission="subscriptions.manage"><Button variant="purple" onClick={() => setShowCreate(true)}><Plus size={14} className="ml-1" /> اشتراك جديد</Button></Can>} />

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
      ) : !subs.length ? (
        <div className="card-light overflow-hidden">
          <EmptyState
            icon={<RefreshCw size={26} strokeWidth={1.6} />}
            title={search || statusFilter ? 'لا توجد نتائج مطابقة' : 'لا توجد اشتراكات بعد'}
            description={search || statusFilter ? 'جرّب تعديل البحث أو الفلتر' : 'ستظهر هنا الاشتراكات فور إنشائها'}
          />
        </div>
      ) : (
        <>
          {/* Mobile cards — a 7-column table has no room on a small screen;
              stacking avoids clipping content behind overflow-hidden. */}
          <div className="md:hidden space-y-2.5">
            {subs.map((sub) => {
              const sc = STATUS_CONFIG[sub.status] || { label: sub.status, badge: 'gray' }
              const daysLeft = sub.endDate ? Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0
              const isExpiringSoon = sub.status === 'active' && daysLeft <= 7 && daysLeft > 0
              return (
                <button key={sub._id} onClick={() => setAdjustSub(sub)} className="w-full text-start card-light p-4 flex items-center gap-3">
                  <Avatar src={getFileUrl(sub.studentId?.avatar)} firstName={sub.studentId?.firstNameAr} lastName={sub.studentId?.lastNameAr} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-brand-textBody truncate">{sub.studentId?.firstNameAr} {sub.studentId?.lastNameAr}</span>
                      <Badge variant={sc.badge}>{sc.label}</Badge>
                    </div>
                    <div className="text-xs text-[#9b7fd6] mt-1 truncate">{sub.packageId?.nameAr} {sub.teacherId?.firstNameAr ? `• ${sub.teacherId.firstNameAr}` : ''}</div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`text-xs font-semibold ${sub.sessionsRemaining <= 2 ? 'text-amber-600' : 'text-brand-textBody'}`}>{sub.sessionsRemaining || 0} حصص متبقية</span>
                      <span className="text-xs text-[#9b7fd6]">{formatDateAr(sub.endDate)}</span>
                      {isExpiringSoon && <span className="text-xs text-amber-600 font-semibold">{daysLeft} أيام للانتهاء</span>}
                      {daysLeft <= 0 && sub.status === 'active' && <span className="text-xs text-red-500 font-semibold">منتهي الصلاحية</span>}
                    </div>
                  </div>
                  <Edit2 size={14} className="text-violet-400 flex-none" />
                </button>
              )
            })}
          </div>

          {/* Desktop/tablet table */}
          <div className="hidden md:block card-light overflow-hidden">
            <div className="overflow-x-auto">
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
            </div>
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
