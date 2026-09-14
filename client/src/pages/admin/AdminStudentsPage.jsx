import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { User, Copy, CheckCircle2 } from 'lucide-react'
import api from '../../utils/api.js'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import PasswordCredentialSection, { emptyCredential, validateCredentialValue, credentialPayload } from '../../components/ui/PasswordCredentialSection.jsx'
import { formatDateAr } from '../../utils/date.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

// ── Create Student Modal ─────────────────────────────────────────────────────

const initialCreateForm = () => ({
  firstNameAr: '',
  lastNameAr: '',
  email: '',
  phone: '',
  studentType: 'new',
  credential: emptyCredential(),
})

function CreateStudentModal({ open, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(initialCreateForm)
  const [createdResult, setCreatedResult] = useState(null)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mut = useMutation({
    mutationFn: (payload) => api.post('/admin/students', payload).then(r => r.data),
    onSuccess: (res) => {
      toast.success('تم إنشاء حساب الطالب بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      const tempPass = res.data?.temporaryPassword || res.temporaryPassword
      const initialPass = tempPass || (form.credential?.mode === 'manual' ? form.credential.password : 'كلمة المرور الموحدة للأكاديمية')
      setCreatedResult({
        email: form.email,
        password: initialPass,
        isDefault: form.credential?.mode === 'academy_default',
        isManual: form.credential?.mode === 'manual',
        isAuto: !!tempPass,
        name: `${form.firstNameAr} ${form.lastNameAr}`,
      })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  function handleClose() {
    setForm(initialCreateForm())
    setCreatedResult(null)
    onClose()
  }

  function submit() {
    if (!form.firstNameAr.trim() || !form.lastNameAr.trim()) return toast.error('الاسم الأول واسم العائلة مطلوبان')
    if (!form.email.trim()) return toast.error('البريد الإلكتروني مطلوب')
    const credErr = validateCredentialValue(form.credential)
    if (credErr) return toast.error(credErr)

    const payload = {
      firstNameAr: form.firstNameAr.trim(),
      lastNameAr: form.lastNameAr.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      studentType: form.studentType,
      credential: credentialPayload(form.credential),
    }
    mut.mutate(payload)
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text)
    toast.success('تم النسخ إلى الحافظة')
  }

  if (createdResult) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="تم إنشاء حساب الطالب بنجاح"
        size="sm"
        footer={<Button variant="purple" onClick={handleClose}>تم، إغلاق النافذة</Button>}
      >
        <div dir="rtl" className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="font-heading font-extrabold text-gray-900 text-base">{createdResult.name}</h4>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-xs text-gray-600">
              <span className="font-mono font-medium">{createdResult.email}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(createdResult.email)}
                className="text-violet-600 hover:text-violet-700 p-0.5"
                title="نسخ البريد الإلكتروني"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
          <div className="bg-violet-50/80 border border-violet-100 rounded-xl p-3 text-right space-y-1.5">
            <div className="text-xs text-violet-700 font-bold">
              {createdResult.isAuto ? 'كلمة المرور المؤقتة المُولّدة:' : createdResult.isManual ? 'كلمة المرور المحددة للحساب:' : 'كلمة مرور تسجيل الدخول:'}
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-violet-200">
              <span className="font-mono text-sm font-bold text-gray-900 select-all">{createdResult.password}</span>
              {!createdResult.isDefault && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdResult.password)}
                  className="flex items-center gap-1 text-xs text-violet-600 font-bold hover:underline"
                >
                  <Copy size={13} /> نسخ
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              {createdResult.isDefault
                ? 'الحساب جاهز لتسجيل الدخول بكلمة مرور الأكاديمية الموحدة.'
                : 'انسخ بيانات الدخول لتسجيل الدخول بها أو تزويد الطالب بها.'}
            </p>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="إضافة طالب جديد" size="sm"
      footer={<>
        <Button variant="ghost" onClick={handleClose}>إلغاء</Button>
        <Button variant="purple" onClick={submit} loading={mut.isPending}>إنشاء الحساب</Button>
      </>}>
      <div className="space-y-3" dir="rtl">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">الاسم الأول *</label><input className={inputCls} value={form.firstNameAr} onChange={e => set('firstNameAr', e.target.value)} /></div>
          <div><label className="text-xs font-bold text-gray-500 mb-1 block">اسم العائلة *</label><input className={inputCls} value={form.lastNameAr} onChange={e => set('lastNameAr', e.target.value)} /></div>
        </div>
        <div><label className="text-xs font-bold text-gray-500 mb-1 block">البريد الإلكتروني *</label><input type="email" dir="ltr" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div><label className="text-xs font-bold text-gray-500 mb-1 block">رقم الهاتف</label><input dir="ltr" className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">نوع الطالب</label>
          <div className="grid grid-cols-2 gap-2">
            {[['existing', 'قديم'], ['new', 'جديد']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set('studentType', v)}
                className={`h-10 rounded-xl text-sm font-bold border transition-colors ${form.studentType === v ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <PasswordCredentialSection
            role="student"
            value={form.credential}
            onChange={(v) => set('credential', v)}
          />
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// Clicking a student opens the one authoritative profile page directly
// (`/admin/students/:id`) — there used to be an intermediate partial "quick
// panel" drawer here whose "السجل الأكاديمي الكامل" link then took a second
// click to reach a different page that still had no edit/reset-password/
// activate controls of its own (those only lived in this drawer, and its
// "تعديل الملف" link pointed at `?edit=...` on this very list, which never
// read that param — a dead link). All of it is now one tabbed profile
// (AdminStudentDetailPage.jsx: overview/subscription & wallet/academic/
// transfers/account), so the list's only job is finding the student and
// navigating straight to it.
export default function AdminStudentsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [studentTypeFilter, setStudentTypeFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'students', page, search, statusFilter, studentTypeFilter],
    queryFn: () => api.get(`/admin/students?page=${page}&limit=15&search=${encodeURIComponent(search)}${statusFilter ? `&status=${statusFilter}` : ''}${studentTypeFilter ? `&studentType=${studentTypeFilter}` : ''}`).then(r => r.data),
    placeholderData: (prev) => prev,
  })

  // Legacy deep-link support: /admin/students?edit=... used to open the side
  // panel here (in practice, it never actually worked — nothing read this
  // param); it now forwards straight to that student's own profile.
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (!editId) return
    navigate(`${ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', editId)}?tab=account`, { replace: true })
  }, [searchParams, navigate])

  const students = data?.data || []

  return (
    <div dir="rtl" className="space-y-5">

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">إدارة الطلاب</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total || 0} طالب — انقر لعرض الملف الكامل والتعديل</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90 bg-violet-600">
          <User size={16} /> إضافة طالب
        </button>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 transition-all" dir="rtl" />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {[['', 'الكل'], ['active', 'نشطون'], ['inactive', 'موقوفون']].map(([k, l]) => (
            <button key={k} onClick={() => { setStatusFilter(k); setPage(1) }}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all ${statusFilter === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {[['', 'كل الأنواع'], ['existing', 'قدامى'], ['new', 'جدد']].map(([k, l]) => (
            <button key={k} onClick={() => { setStudentTypeFilter(k); setPage(1) }}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all ${studentTypeFilter === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table (md+) / Cards (mobile) — a 6-column table has no room on a
          360–390px viewport; stacking as cards below md avoids clipping
          content instead of just scrolling it out of reach. */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-violet-600" /></div>
      ) : !students.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-gray-500">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <User size={24} />
          </div>
          <p className="font-semibold text-gray-600">لا توجد نتائج</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {students.map((st) => (
              <motion.div
                key={st._id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ duration: 0.15 }}
              >
                <Link to={ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', st._id)}
                  className="w-full text-start bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 block">
                  <Avatar src={getFileUrl(st.avatar)} firstName={st.firstNameAr} lastName={st.lastNameAr} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{st.firstNameAr} {st.lastNameAr}</div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">{st.email}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {st.isActive ? 'نشط' : 'موقوف'}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.studentType === 'new' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        {st.studentType === 'new' ? 'جديد' : 'قديم'}
                      </span>
                      <span className="text-[10px] text-gray-500">{formatDateAr(st.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Desktop/tablet table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['الطالب', 'البريد الإلكتروني', 'الهاتف', 'تاريخ التسجيل', 'النوع', 'الحالة'].map(h => (
                      <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <motion.tr key={st._id} whileHover={{ backgroundColor: '#FAFAFA' }}
                      className="border-b border-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', st._id))}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={getFileUrl(st.avatar)} firstName={st.firstNameAr} lastName={st.lastNameAr} size="sm" />
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{st.firstNameAr} {st.lastNameAr}</div>
                            {st.bioAr && <div className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-[160px]">{st.bioAr}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm text-gray-600">{st.email}</span></td>
                      <td className="px-5 py-4"><span className="text-sm text-gray-600" dir="ltr">{st.phone || '—'}</span></td>
                      <td className="px-5 py-4"><span className="text-sm text-gray-600">{formatDateAr(st.createdAt)}</span></td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.studentType === 'new' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                          {st.studentType === 'new' ? 'جديد' : 'قديم'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${st.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {st.isActive ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {data?.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination current={page} total={data.totalPages} onChange={setPage} />
        </div>
      )}

      <CreateStudentModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
