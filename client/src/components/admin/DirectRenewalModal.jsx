import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { RefreshCw, Calendar, BookOpen, User, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Avatar from '../ui/Avatar.jsx'
import Spinner from '../ui/Spinner.jsx'
import { formatCurrency } from '../../utils/format.js'
import { formatDateAr } from '../../utils/date.js'
import { getFileUrl } from '../../config/constants.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const labelCls = 'text-xs font-bold text-gray-500 mb-1.5 block'

export default function DirectRenewalModal({
  open,
  onClose,
  initialStudent = null,
  initialSubscription = null,
  onSuccess,
}) {
  const qc = useQueryClient()
  const [selectedStudent, setSelectedStudent] = useState(initialStudent)
  const [packageId, setPackageId] = useState(initialSubscription?.packageId?._id || initialSubscription?.packageId || '')
  const [teacherId, setTeacherId] = useState(initialSubscription?.teacherId?._id || initialSubscription?.teacherId || '')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Sync state when props change
  useEffect(() => {
    if (initialStudent) setSelectedStudent(initialStudent)
    if (initialSubscription) {
      if (initialSubscription.packageId?._id || initialSubscription.packageId) {
        setPackageId(initialSubscription.packageId?._id || initialSubscription.packageId)
      }
      if (initialSubscription.teacherId?._id || initialSubscription.teacherId) {
        setTeacherId(initialSubscription.teacherId?._id || initialSubscription.teacherId)
      }
    }
  }, [initialStudent, initialSubscription])

  // Fetch active packages
  const { data: packages = [], isLoading: loadPackages } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => api.get('/packages').then(r => r.data.data || []),
    enabled: open,
  })

  // Fetch active teachers
  const { data: teachers = [], isLoading: loadTeachers } = useQuery({
    queryKey: ['admin', 'teachers', 'all-active'],
    queryFn: () => api.get('/admin/teachers?status=active&limit=100').then(r => r.data.data || []),
    enabled: open,
  })

  // Student search query if no initialStudent provided
  const { data: searchStudents = [], isLoading: searchLoading } = useQuery({
    queryKey: ['admin', 'students', 'search', searchQuery],
    queryFn: () => api.get(`/admin/students?search=${encodeURIComponent(searchQuery)}&limit=8`).then(r => r.data.data || []),
    enabled: open && !selectedStudent && searchQuery.trim().length > 1,
  })

  const selectedPkg = packages.find(p => p._id === packageId)

  // Direct Renewal Mutation
  const renewMutation = useMutation({
    mutationFn: async () => {
      const studentId = selectedStudent?._id || selectedStudent?.id
      if (!studentId) throw new Error('يرجى تحديد الطالب')
      if (!packageId) throw new Error('يرجى تحديد الباقة')

      // If an existing subscription exists, call the direct renew endpoint
      if (initialSubscription?._id) {
        const payload = {
          packageId,
          teacherId: teacherId || undefined,
          startDate: startDate || undefined,
          notes: notes.trim() || undefined,
        }
        return api.post(`/subscriptions/${initialSubscription._id}/renew`, payload).then(r => r.data)
      } else {
        // Create fresh subscription for this student
        const payload = {
          studentId,
          packageId,
          teacherId: teacherId || undefined,
          startDate: startDate || undefined,
          notes: notes.trim() || undefined,
        }
        return api.post('/subscriptions', payload).then(r => r.data)
      }
    },
    onSuccess: (res) => {
      toast.success('تم تجديد وتفعيل الاشتراك بنجاح!')
      qc.invalidateQueries({ queryKey: ['admin', 'student'] })
      qc.invalidateQueries({ queryKey: ['admin', 'subscription-renewals'] })
      qc.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
      onSuccess?.(res)
      onClose()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ أثناء التجديد')
    },
  })

  const canSubmit = selectedStudent && packageId && !renewMutation.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تجديد اشتراك مباشر للطالب"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={onClose} disabled={renewMutation.isPending}>
            إلغاء
          </Button>
          <Button
            variant="purple"
            icon={<Sparkles size={15} />}
            loading={renewMutation.isPending}
            disabled={!canSubmit}
            onClick={() => renewMutation.mutate()}
          >
            تأكيد التجديد الفوري
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-4">
        {/* Student Section */}
        {selectedStudent ? (
          <div className="bg-violet-50/60 border border-violet-100 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                src={getFileUrl(selectedStudent.avatar)}
                firstName={selectedStudent.firstNameAr}
                lastName={selectedStudent.lastNameAr}
                size="md"
              />
              <div>
                <div className="text-xs text-violet-600 font-bold">الطالب المستفيد</div>
                <div className="font-heading font-extrabold text-gray-900 text-sm">
                  {selectedStudent.firstNameAr} {selectedStudent.lastNameAr}
                </div>
                <div className="text-xs text-gray-500">{selectedStudent.email}</div>
              </div>
            </div>
            {!initialStudent && (
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-xs text-violet-600 hover:underline font-semibold"
              >
                تغيير الطالب
              </button>
            )}
          </div>
        ) : (
          <div>
            <label className={labelCls}>البحث عن الطالب وتحديده *</label>
            <input
              type="text"
              placeholder="اكتب اسم الطالب أو بريده الإلكتروني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={inputCls}
            />
            {searchLoading && <div className="py-2 text-center text-xs text-gray-400">جاري البحث...</div>}
            {searchStudents.length > 0 && !selectedStudent && (
              <div className="mt-1.5 border border-gray-100 rounded-xl bg-white shadow-sm max-h-48 overflow-y-auto divide-y divide-gray-50">
                {searchStudents.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(s)
                      setSearchQuery('')
                    }}
                    className="w-full p-2.5 flex items-center justify-between text-right hover:bg-violet-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar src={getFileUrl(s.avatar)} firstName={s.firstNameAr} lastName={s.lastNameAr} size="sm" />
                      <div>
                        <div className="text-sm font-bold text-gray-800">{s.firstNameAr} {s.lastNameAr}</div>
                        <div className="text-xs text-gray-400">{s.email}</div>
                      </div>
                    </div>
                    <span className="text-xs text-violet-600 font-semibold">اختيار</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Package Selector */}
        <div>
          <label className={labelCls}>الباقة المراد تجديدها أو الاشتراك بها *</label>
          {loadPackages ? (
            <div className="py-3 flex justify-center"><Spinner size="sm" color="border-violet-600" /></div>
          ) : (
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className={inputCls}
            >
              <option value="">— اختر الباقة —</option>
              {packages.map((pkg) => (
                <option key={pkg._id} value={pkg._id}>
                  {pkg.nameAr} — {pkg.sessionsPerMonth} حصص ({formatCurrency(pkg.price)})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Teacher Selector */}
        <div>
          <label className={labelCls}>المعلم المسؤول (اختياري — إبقاء المعلم الحالي أو تعيين معلم جديد)</label>
          {loadTeachers ? (
            <div className="py-3 flex justify-center"><Spinner size="sm" color="border-violet-600" /></div>
          ) : (
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className={inputCls}
            >
              <option value="">— نفس المعلم الحالي / بدون تخصيص —</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.firstNameAr} {t.lastNameAr} {t.specializations?.length ? `(${t.specializations.join('، ')})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Start Date */}
        <div>
          <label className={labelCls}>تاريخ بدء الدورة الجديدة *</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Notes */}
        <div>
          <label className={labelCls}>ملاحظات إدارية (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات حول التجديد أو طريقة السداد اليدوي..."
            className={`${inputCls} h-20 py-2.5 resize-none`}
          />
        </div>

        {/* Additive Guarantee Banner */}
        <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-3.5 text-xs text-emerald-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-emerald-900">
            <CheckCircle2 size={14} className="text-emerald-600 flex-none" />
            ضمان الدمج التراكمي للرصيد
          </div>
          <p className="leading-relaxed">
            عند إتمام التجديد، يُضاف رصيد حصص الباقة الجديدة مباشرة إلى رصيد المحفظة دون تصفير أي حصص متبقية سابقة، مع فتح دورة اشتراكية جديدة وتوثيق العملية في سجل التدقيق وإشعار الطالب فورياً.
          </p>
        </div>
      </div>
    </Modal>
  )
}
