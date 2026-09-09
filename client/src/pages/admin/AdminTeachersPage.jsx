import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { GraduationCap, Plus, UserPlus, ChevronLeft } from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import GenderSegmentedControl from '../../components/ui/GenderSegmentedControl.jsx'
import ShiftsMultiSelect from '../../components/ui/ShiftsMultiSelect.jsx'
import SpecializationsMultiSelect from '../../components/ui/SpecializationsMultiSelect.jsx'
import AudienceCategoriesMultiSelect from '../../components/ui/AudienceCategoriesMultiSelect.jsx'
import PasswordCredentialSection, { emptyCredential, validateCredentialValue, credentialPayload } from '../../components/ui/PasswordCredentialSection.jsx'
import Can from '../../components/shared/Can.jsx'
import { formatDateAr } from '../../utils/date.js'
import { resolveTeacherIdentity } from '../../utils/teacherIdentity.js'
import { subjectLabel } from '../../utils/teacherProfile.js'
import { useTeachingSubjects } from '../../hooks/useTeachingSubjects.js'
import { ROUTES } from '../../config/constants.js'

// ── Create Teacher Modal ─────────────────────────────────────────────────────

const initialForm = {
  firstNameAr: '', lastNameAr: '', email: '', credential: emptyCredential(), phone: '', specialization: '', gender: '',
  specializations: [], audienceCategories: [], hourlyRate: '', availableShifts: [],
}

function CreateTeacherModal({ open, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(initialForm)

  const createMutation = useMutation({
    mutationFn: (d) => {
      const { credential, ...rest } = d
      return api.post('/admin/teachers', { ...rest, role: 'teacher', credential: credentialPayload(credential) })
    },
    onSuccess: (res) => {
      toast.success('تم إنشاء حساب المعلم')
      if (res?.data?.data?.temporaryPassword) {
        toast.success(`كلمة المرور المؤقتة: ${res.data.data.temporaryPassword}`, { duration: 15000 })
      }
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      onClose()
      setForm(initialForm)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }
  function submitCreate() {
    if (!form.gender) return toast.error('يرجى تحديد تصنيف المعلم: معلم أو معلمة')
    if (!form.specializations.length) return toast.error('يرجى تحديد تخصص تدريس واحد على الأقل')
    if (form.hourlyRate === '' || Number(form.hourlyRate) < 0 || Number.isNaN(Number(form.hourlyRate))) {
      return toast.error('يرجى تحديد سعر ساعة تدريس صحيح')
    }
    if (!form.availableShifts.length) return toast.error('يرجى تحديد شيفت واحد على الأقل')
    const credentialError = validateCredentialValue(form.credential)
    if (credentialError) return toast.error(credentialError)
    createMutation.mutate(form)
  }

  return (
    <Modal open={open} onClose={onClose} title="إضافة معلم جديد" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button variant="purple" onClick={submitCreate} loading={createMutation.isPending}>إنشاء الحساب</Button>
      </>}>
      <div className="space-y-4">
        <GenderSegmentedControl value={form.gender} onChange={v => setForm(p => ({ ...p, gender: v }))} required />
        <div className="grid grid-cols-2 gap-4">
          <Input label="الاسم الأول" name="firstNameAr" value={form.firstNameAr} onChange={change} variant="light" />
          <Input label="اسم العائلة" name="lastNameAr" value={form.lastNameAr} onChange={change} variant="light" />
        </div>
        <Input label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={change} variant="light" />
        <PasswordCredentialSection value={form.credential} onChange={(v) => setForm(p => ({ ...p, credential: v }))} role="teacher" compact />
        <div className="grid grid-cols-2 gap-4">
          <Input label="رقم الهاتف" name="phone" value={form.phone} onChange={change} variant="light" />
          <Input label="التخصص" name="specialization" value={form.specialization} onChange={change} variant="light" />
        </div>
        <SpecializationsMultiSelect value={form.specializations} onChange={v => setForm(p => ({ ...p, specializations: v }))} required />
        <AudienceCategoriesMultiSelect value={form.audienceCategories} onChange={v => setForm(p => ({ ...p, audienceCategories: v }))} />
        <Input label="سعر ساعة التدريس" name="hourlyRate" type="number" min="0" step="0.5"
          value={form.hourlyRate} onChange={change} variant="light" placeholder="0" />
        <ShiftsMultiSelect value={form.availableShifts} onChange={v => setForm(p => ({ ...p, availableShifts: v }))} required />
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// Clicking a teacher opens the one authoritative profile page directly
// (`/admin/teachers/:id`) — there used to be an intermediate partial "quick
// panel" drawer here whose own "full profile" link then took a second click
// to reach a different, also-incomplete page. Both are now merged into a
// single tabbed profile (AdminTeacherProfilePage.jsx: overview/students/
// performance/payroll/account), so the list's only job is finding the
// teacher and navigating straight to it.
export default function AdminTeachersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data: subjects = [] } = useTeachingSubjects()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'teachers', page, search],
    queryFn: () => api.get(`/admin/teachers?page=${page}&limit=15&search=${encodeURIComponent(search)}`).then(r => r.data),
    placeholderData: (prev) => prev,
  })

  // Legacy deep-link support: /admin/teachers?teacherId=... used to open the
  // side panel here; it now forwards straight to that teacher's own profile
  // (performance tab), so any old link/notification still lands correctly.
  useEffect(() => {
    const teacherId = searchParams.get('teacherId')
    if (!teacherId) return
    navigate(`${ROUTES.ADMIN_TEACHER_PROFILE.replace(':id', teacherId)}?tab=performance`, { replace: true })
  }, [searchParams, navigate])

  const teachers = data?.data || []

  return (
    <div dir="rtl" className="space-y-5">

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">إدارة المعلمين</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total || 0} معلم — انقر على معلم لعرض ملفه الإداري الكامل</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Can all={['teachers.manage', 'students.manage']}>
            <Link to={ROUTES.ADMIN_TEACHER_ONBOARDING}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
              <UserPlus size={16} /> إضافة معلم وطلابه
            </Link>
          </Can>
          <Can permission="teachers.manage">
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90 bg-violet-600">
              <Plus size={16} /> إضافة معلم
            </button>
          </Can>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="relative max-w-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="بحث عن معلم..." dir="rtl"
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-4 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-violet-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teachers.map((t) => (
            <motion.div key={t._id} whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
              <Link
                to={ROUTES.ADMIN_TEACHER_PROFILE.replace(':id', t._id)}
                className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
              >
                <div className="flex items-start gap-3 mb-4">
                  <Avatar src={resolveTeacherIdentity(t).displayAvatar} firstName={t.firstNameAr} lastName={t.lastNameAr} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-bold text-gray-900 text-base truncate">{t.firstNameAr} {t.lastNameAr}</div>
                    {t.specialization && <div className="text-xs text-gray-500 mt-0.5 truncate">{t.specialization}</div>}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {t.isActive ? 'نشط' : 'موقوف'}
                      </span>
                      {!t.gender && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">التصنيف غير محدد</span>
                      )}
                      {(t.specializations?.length ? t.specializations : (t.category ? [t.category] : [])).slice(0, 2).map((c) => (
                        <span key={c} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">{subjectLabel(subjects, c)}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex flex-col items-center py-2.5 rounded-xl bg-violet-50">
                    <div className="font-heading font-extrabold text-lg text-violet-700">{t.studentCount || 0}</div>
                    <div className="text-[11px] text-violet-600">طالب</div>
                  </div>
                  <div className="flex flex-col items-center py-2.5 rounded-xl bg-amber-50">
                    <div className="font-heading font-extrabold text-lg text-amber-600">{t.sessionCount || 0}</div>
                    <div className="text-[11px] text-amber-600">حصة</div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <span className="text-xs text-gray-500">انضم {formatDateAr(t.createdAt)}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-violet-600">
                    الملف الكامل <ChevronLeft size={12} />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && !teachers.length && (
        <div className="bg-white rounded-2xl p-16 border border-gray-100 flex flex-col items-center text-gray-500">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><GraduationCap size={24} /></div>
          <p className="font-semibold text-gray-600">لا يوجد معلمون</p>
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination current={page} total={data.totalPages} onChange={setPage} />
        </div>
      )}

      <CreateTeacherModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
