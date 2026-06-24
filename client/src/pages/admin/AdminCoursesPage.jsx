import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

const LEVEL_CONFIG = {
  beginner:     { label: 'مبتدئ',   color: '#10b981', bg: '#f0fdf4' },
  intermediate: { label: 'متوسط',   color: '#7c3aed', bg: '#f5f3ff' },
  advanced:     { label: 'متقدم',   color: '#E8C76A', bg: '#fffbeb' },
}

const AGE_CONFIG = {
  children: { label: 'أطفال',    icon: '👶' },
  teens:    { label: 'مراهقون',  icon: '🧑' },
  adults:   { label: 'بالغون',   icon: '🎓' },
}

// ── Course Action Menu ────────────────────────────────────────────────────────

function CourseActionMenu({ course, onEdit, onToggle, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -8 }}
      transition={{ duration: 0.12 }}
      className="absolute left-0 top-10 z-30 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      style={{ direction: 'rtl' }}
    >
      <button
        onClick={() => { onEdit(course); onClose() }}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        تعديل
      </button>
      <button
        onClick={() => { onToggle(course); onClose() }}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 transition-colors border-t border-gray-50"
        style={{ color: course.isActive ? '#ef4444' : '#10b981' }}
      >
        {course.isActive
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M10 15V9M14 15V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="m10 8 6 4-6 4V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
        }
        {course.isActive ? 'إيقاف المقرر' : 'تفعيل المقرر'}
      </button>
    </motion.div>
  )
}

// ── Course Card ───────────────────────────────────────────────────────────────

function CourseCard({ course, onEdit, onToggle }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const lvl = LEVEL_CONFIG[course.level] || { label: course.level, color: '#9ca3af', bg: '#f9fafb' }
  const age = AGE_CONFIG[course.ageGroup] || { label: course.ageGroup, icon: '📚' }
  const enrollment = course.enrollmentCount || 0

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all"
    >
      {/* Top color stripe based on level */}
      <div className="h-1.5" style={{ background: lvl.color }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: lvl.bg, color: lvl.color }}
              >
                {lvl.label}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                course.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {course.isActive ? 'نشط' : 'موقوف'}
              </span>
            </div>
            <h3 className="font-heading font-bold text-gray-900 text-base">{course.nameAr}</h3>
            {course.name && <div className="text-xs text-gray-400 mt-0.5">{course.name}</div>}
          </div>

          <div className="relative flex-none">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <CourseActionMenu
                  course={course}
                  onEdit={onEdit}
                  onToggle={onToggle}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Description */}
        {course.descriptionAr && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{course.descriptionAr}</p>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-violet-50">
            <div className="font-heading font-extrabold text-base text-violet-700">{enrollment}</div>
            <div className="text-[10px] text-violet-500 mt-0.5">طالب</div>
          </div>
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-amber-50">
            <div className="font-heading font-extrabold text-base text-amber-600">{course.durationWeeks}</div>
            <div className="text-[10px] text-amber-500 mt-0.5">أسبوع</div>
          </div>
          <div className="flex flex-col items-center py-2.5 rounded-xl bg-gray-50">
            <div className="text-base">{age.icon}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{age.label}</div>
          </div>
        </div>

        {/* Progress bar — enrollment visual */}
        {enrollment > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">نسبة التسجيل</span>
              <span className="text-xs font-semibold text-gray-600">{enrollment} طالب</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  background: lvl.color,
                  width: `${Math.min(100, (enrollment / 20) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-gray-50">
          <button
            onClick={() => onEdit(course)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
          >
            تعديل
          </button>
          <button
            onClick={() => onToggle(course)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
              course.isActive
                ? 'text-gray-500 bg-gray-50 hover:bg-gray-100'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            {course.isActive ? 'إيقاف' : 'تفعيل'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Course Form Modal ─────────────────────────────────────────────────────────

const initialForm = {
  nameAr: '', name: '', descriptionAr: '', level: 'beginner', ageGroup: 'adults', durationWeeks: 12
}

function CourseFormModal({ open, onClose, onSubmit, loading, initialValues, title }) {
  const [form, setForm] = useState(initialValues || initialForm)

  useEffect(() => {
    if (open) setForm(initialValues || initialForm)
  }, [open, initialValues])

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button variant="purple" onClick={() => onSubmit(form)} loading={loading}>
            {title === 'إضافة مقرر جديد' ? 'إنشاء المقرر' : 'حفظ التغييرات'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">الاسم بالعربية</label>
            <input name="nameAr" value={form.nameAr} onChange={change} className="field-light w-full" placeholder="مثال: تحسين التلاوة" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">الاسم بالإنجليزية</label>
            <input name="name" value={form.name} onChange={change} className="field-light w-full" placeholder="Tajweed Improvement" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">الوصف</label>
          <textarea
            name="descriptionAr"
            value={form.descriptionAr}
            onChange={change}
            rows={3}
            className="field-light resize-none w-full"
            placeholder="وصف المقرر الدراسي..."
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">المستوى</label>
            <select name="level" value={form.level} onChange={change} className="field-light w-full">
              <option value="beginner">مبتدئ</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">متقدم</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">الفئة العمرية</label>
            <select name="ageGroup" value={form.ageGroup} onChange={change} className="field-light w-full">
              <option value="children">أطفال</option>
              <option value="teens">مراهقون</option>
              <option value="adults">بالغون</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">المدة (أسبوع)</label>
            <input type="number" name="durationWeeks" value={form.durationWeeks} onChange={change} className="field-light w-full" min="1" />
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminCoursesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [editCourse, setEditCourse] = useState(null)
  const [filterLevel, setFilterLevel] = useState('all')
  const qc = useQueryClient()

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: () => api.get('/courses').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/courses', { ...data, durationWeeks: Number(data.durationWeeks) }),
    onSuccess: () => {
      toast.success('تم إنشاء المقرر')
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      setShowCreate(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/courses/${id}`, {
      ...data,
      durationWeeks: data.durationWeeks !== undefined ? Number(data.durationWeeks) : undefined,
    }),
    onSuccess: () => {
      toast.success('تم تحديث المقرر')
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      setEditCourse(null)
    },
    onError: () => toast.error('حدث خطأ'),
  })

  function handleToggle(course) {
    updateMutation.mutate({ id: course._id, isActive: !course.isActive })
  }

  const filtered = filterLevel === 'all' ? courses : courses.filter(c => c.level === filterLevel)

  const totalStudents = courses.reduce((sum, c) => sum + (c.enrollmentCount || 0), 0)
  const activeCourses = courses.filter(c => c.isActive).length

  return (
    <div dir="rtl" className="space-y-5 max-w-[1400px]">

      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">المقررات والمستويات</h1>
          <p className="text-sm text-gray-500 mt-0.5">{courses.length} مقرر • {totalStudents} طالب مسجل</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ background: '#7c3aed' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          مقرر جديد
        </button>
      </div>

      {/* Summary + Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-gray-700">{activeCourses} مقرر نشط</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-sm font-semibold text-gray-700">{totalStudents} طالب كلي</span>
            </div>
          </div>

          {/* Level filter tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'beginner', label: 'مبتدئ' },
              { key: 'intermediate', label: 'متوسط' },
              { key: 'advanced', label: 'متقدم' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterLevel(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterLevel === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-violet-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <CourseCard
              key={c._id}
              course={c}
              onEdit={(course) => setEditCourse(course)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {!isLoading && !filtered.length && (
        <div className="bg-white rounded-2xl p-16 border border-gray-100 flex flex-col items-center text-gray-400">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="13" y="4" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="13" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="13" y="13" width="8" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>
          </div>
          <p className="font-semibold text-gray-500">لا توجد مقررات</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90"
            style={{ background: '#7c3aed' }}
          >
            إضافة أول مقرر
          </button>
        </div>
      )}

      {/* Create Modal */}
      <CourseFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(form) => createMutation.mutate(form)}
        loading={createMutation.isPending}
        title="إضافة مقرر جديد"
      />

      {/* Edit Modal */}
      <CourseFormModal
        open={!!editCourse}
        onClose={() => setEditCourse(null)}
        onSubmit={(form) => updateMutation.mutate({ id: editCourse._id, ...form })}
        loading={updateMutation.isPending}
        initialValues={editCourse ? {
          nameAr: editCourse.nameAr || '',
          name: editCourse.name || '',
          descriptionAr: editCourse.descriptionAr || '',
          level: editCourse.level || 'beginner',
          ageGroup: editCourse.ageGroup || 'adults',
          durationWeeks: editCourse.durationWeeks || 12,
        } : null}
        title="تعديل المقرر"
      />
    </div>
  )
}
