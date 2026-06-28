import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BookOpen, CircleCheck, Pencil, Archive, Star, UserRound,
} from 'lucide-react'
import api from '../../utils/api.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'
import Spinner from '../../components/ui/Spinner.jsx'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_MAP = {
  tajweed: { label: 'التجويد',  color: '#7c3aed', bg: 'rgba(124,58,237,0.1)'  },
  hifz:    { label: 'الحفظ',   color: '#059669', bg: 'rgba(5,150,105,0.1)'    },
  nazra:   { label: 'النظر',   color: '#2563eb', bg: 'rgba(37,99,235,0.1)'    },
  arabic:  { label: 'العربية', color: '#d97706', bg: 'rgba(217,119,6,0.1)'    },
  quran:   { label: 'القرآن',  color: '#b45309', bg: 'rgba(180,83,9,0.1)'     },
  other:   { label: 'أخرى',   color: '#64748b', bg: 'rgba(100,116,139,0.1)'  },
}

const DIFFICULTY_MAP = {
  beginner:     { label: 'مبتدئ', color: '#059669' },
  intermediate: { label: 'متوسط', color: '#7c3aed' },
  advanced:     { label: 'متقدم', color: '#d97706' },
}

const STATUS_MAP = {
  published: { label: 'منشور', color: '#059669', bg: 'rgba(5,150,105,0.1)',   dotClass: 'bg-emerald-500' },
  draft:     { label: 'مسودة', color: '#64748b', bg: 'rgba(100,116,139,0.1)', dotClass: 'bg-slate-400'   },
  archived:  { label: 'أرشيف', color: '#d97706', bg: 'rgba(217,119,6,0.1)',   dotClass: 'bg-amber-500'   },
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ value, label, color, Icon }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-none"
        style={{ background: `${color}18` }}
      >
        <Icon size={20} strokeWidth={1.8} color={color} />
      </div>
      <div>
        <div className="font-heading font-extrabold text-2xl text-slate-900 leading-none tabular-nums">
          {value ?? '—'}
        </div>
        <div className="text-xs text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  )
}

// ── Context Menu (shared by table row & grid card) ────────────────────────────

function ContextMenu({ isOpen, items, align = 'left' }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -6 }}
          transition={{ duration: 0.12 }}
          className={`absolute top-9 z-30 w-44 bg-white rounded-xl shadow-xl ring-1 ring-slate-200 overflow-hidden ${align === 'left' ? 'left-0' : 'right-0'}`}
          onClick={e => e.stopPropagation()}
        >
          {items.map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className="flex items-center w-full px-4 py-2.5 text-xs font-semibold text-right transition-colors hover:bg-slate-50"
              style={{ color: item.color }}
            >
              {item.label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Course Table Row ──────────────────────────────────────────────────────────

function CourseTableRow({ course, selected, onSelect, onEdit, onTogglePublish, onToggleFeature, onDuplicate, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cat    = CATEGORY_MAP[course.category]     || CATEGORY_MAP.other
  const diff   = DIFFICULTY_MAP[course.difficulty] || DIFFICULTY_MAP.beginner
  const status = STATUS_MAP[course.status]         || STATUS_MAP.draft

  const menuItems = [
    {
      label: course.status === 'published' ? 'إلغاء النشر' : 'نشر المقرر',
      color: course.status === 'published' ? '#d97706' : '#059669',
      action: () => { onTogglePublish(course); setMenuOpen(false) },
    },
    { label: course.featured ? 'إلغاء التمييز' : 'تمييز المقرر', color: '#b45309', action: () => { onToggleFeature(course); setMenuOpen(false) } },
    { label: 'نسخ المقرر', color: '#475569', action: () => { onDuplicate(course); setMenuOpen(false) } },
    { label: 'حذف المقرر', color: '#dc2626', action: () => { onDelete(course);    setMenuOpen(false) } },
  ]

  return (
    <tr
      className="border-b border-slate-100 transition-colors hover:bg-slate-50/70"
      style={{ background: selected ? 'rgba(124,58,237,0.04)' : 'transparent' }}
    >
      {/* Checkbox */}
      <td className="py-3 px-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(course._id)}
          className="rounded border-slate-300 accent-violet-600 cursor-pointer"
          onClick={e => e.stopPropagation()}
        />
      </td>

      {/* Course */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {course.thumbnailImage ? (
            <img
              src={getFileUrl(course.thumbnailImage)}
              alt=""
              className="w-12 h-9 rounded-lg object-cover flex-none border border-slate-200"
            />
          ) : (
            <div
              className="w-12 h-9 rounded-lg flex items-center justify-center flex-none border border-slate-100"
              style={{ background: `${cat.color}0f` }}
            >
              <BookOpen size={16} strokeWidth={1.8} color={cat.color} />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-sm text-slate-900 leading-tight line-clamp-1">{course.nameAr}</div>
            {course.name && <div className="text-xs text-slate-400 mt-0.5 truncate">{course.name}</div>}
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="py-3 px-4">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
          style={{ color: cat.color, background: cat.bg }}
        >
          {cat.label}
        </span>
      </td>

      {/* Difficulty */}
      <td className="py-3 px-4">
        <span className="text-xs font-semibold" style={{ color: diff.color }}>{diff.label}</span>
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ color: status.color, background: status.bg }}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-none ${status.dotClass}`} />
          {status.label}
        </span>
      </td>

      {/* Students */}
      <td className="py-3 px-4 text-sm text-center font-semibold text-slate-700 tabular-nums">
        {(course.studentsCount || course.enrollmentCount || 0).toLocaleString('ar')}
      </td>

      {/* Featured */}
      <td className="py-3 px-4 text-center">
        {course.featured
          ? <Star size={16} strokeWidth={0} fill="#E8C76A" />
          : <span className="text-slate-300 text-sm">—</span>}
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(course._id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
          >
            تعديل
          </button>
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="5"  r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </button>
            <ContextMenu isOpen={menuOpen} items={menuItems} align="left" />
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Course Grid Card ──────────────────────────────────────────────────────────

function CourseGridCard({ course, selected, onSelect, onEdit, onTogglePublish, onToggleFeature, onDuplicate, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cat    = CATEGORY_MAP[course.category]     || CATEGORY_MAP.other
  const diff   = DIFFICULTY_MAP[course.difficulty] || DIFFICULTY_MAP.beginner
  const status = STATUS_MAP[course.status]         || STATUS_MAP.draft

  const menuItems = [
    { label: course.status === 'published' ? 'إلغاء النشر' : 'نشر', color: course.status === 'published' ? '#d97706' : '#059669', action: () => { onTogglePublish(course); setMenuOpen(false) } },
    { label: course.featured ? 'إلغاء التمييز' : 'تمييز', color: '#b45309', action: () => { onToggleFeature(course); setMenuOpen(false) } },
    { label: 'نسخ',  color: '#475569', action: () => { onDuplicate(course); setMenuOpen(false) } },
    { label: 'حذف',  color: '#dc2626', action: () => { onDelete(course);    setMenuOpen(false) } },
  ]

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.15 }}
      className="bg-white rounded-2xl overflow-hidden border transition-colors duration-200 relative"
      style={{ borderColor: selected ? 'rgba(124,58,237,0.4)' : '#e2e8f0' }}
    >
      {/* Selection checkbox */}
      <div className="absolute top-3 right-3 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(course._id)}
          className="rounded accent-violet-600 cursor-pointer shadow"
          onClick={e => e.stopPropagation()}
        />
      </div>

      {/* Featured star */}
      {course.featured && (
        <div className="absolute top-3 left-10 z-10">
          <Star size={14} strokeWidth={0} fill="#E8C76A" />
        </div>
      )}

      {/* Menu */}
      <div className="absolute top-3 left-3 z-10">
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5"  r="1.5" fill="currentColor"/>
              <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
            </svg>
          </button>
          <ContextMenu isOpen={menuOpen} items={menuItems} align="left" />
        </div>
      </div>

      {/* Thumbnail */}
      <div className="w-full h-40 overflow-hidden relative">
        {course.thumbnailImage ? (
          <img src={getFileUrl(course.thumbnailImage)} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `${cat.color}12` }}
          >
            <BookOpen size={32} strokeWidth={1.4} color={cat.color} style={{ opacity: 0.5 }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)' }} />
        <div className="absolute bottom-2 right-2">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: status.color, background: 'rgba(255,255,255,0.92)' }}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: cat.color, background: cat.bg }}
          >
            {cat.label}
          </span>
          <span className="text-[10px] font-semibold" style={{ color: diff.color }}>• {diff.label}</span>
        </div>

        <h3 className="font-heading font-bold text-sm text-slate-900 line-clamp-2 mb-1 leading-snug">
          {course.nameAr}
        </h3>
        {course.name && <p className="text-[11px] text-slate-400 mb-3 truncate">{course.name}</p>}

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="7" r="4" stroke="#94a3b8" strokeWidth="1.8"/>
              <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <span className="text-[11px] text-slate-500">{course.studentsCount || course.enrollmentCount || 0}</span>
          </div>
          {course.lessonsCount > 0 && (
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="#94a3b8" strokeWidth="1.8"/>
                <path d="M9 9l6 3-6 3V9Z" fill="#94a3b8"/>
              </svg>
              <span className="text-[11px] text-slate-500">{course.lessonsCount} درس</span>
            </div>
          )}
          {course.estimatedDuration > 0 && (
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#94a3b8" strokeWidth="1.8"/>
                <path d="M12 7v5l3 3" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span className="text-[11px] text-slate-500">{course.estimatedDuration}س</span>
            </div>
          )}
        </div>

        <button
          onClick={() => onEdit(course._id)}
          className="w-full py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
        >
          تعديل المقرر
        </button>
      </div>
    </motion.div>
  )
}

// ── Bulk Action Bar ───────────────────────────────────────────────────────────

function BulkActionBar({ count, onAction, onClear }) {
  const actions = [
    { label: 'نشر',          action: 'publish',   className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' },
    { label: 'إلغاء النشر', action: 'unpublish', className: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'         },
    { label: 'تمييز',        action: 'feature',   className: 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'     },
    { label: 'أرشفة',        action: 'archive',   className: 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'        },
    { label: 'حذف',          action: 'delete',    className: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'                 },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap"
    >
      <span className="text-sm font-semibold text-violet-700">تم تحديد {count} مقرر</span>
      <div className="flex items-center gap-2 flex-wrap mr-auto">
        {actions.map(item => (
          <button
            key={item.action}
            onClick={() => onAction(item.action)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${item.className}`}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors pr-2"
        >
          إلغاء التحديد
        </button>
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminCoursesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [view, setView]                         = useState('table')
  const [search, setSearch]                     = useState('')
  const [filterStatus, setFilterStatus]         = useState('all')
  const [filterCategory, setFilterCategory]     = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [sort, setSort]                         = useState('newest')
  const [page, setPage]                         = useState(1)
  const [selected, setSelected]                 = useState([])

  // ── Queries ──

  const { data: stats } = useQuery({
    queryKey: ['admin', 'courses', 'stats'],
    queryFn: () => api.get('/courses/admin/stats').then(r => r.data.data),
    staleTime: 60_000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'courses', 'list', { search, filterStatus, filterCategory, filterDifficulty, sort, page }],
    queryFn: () => api.get('/courses/admin/all', {
      params: { search, status: filterStatus, category: filterCategory, difficulty: filterDifficulty, sort, page, limit: 20 },
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const courses    = data?.data       || []
  const total      = data?.total      || 0
  const totalPages = data?.totalPages || 1

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
  }, [qc])

  // ── Mutations ──

  const publishMutation = useMutation({
    mutationFn: (course) => api.post(`/courses/admin/${course._id}/publish`),
    onSuccess: (_, course) => {
      toast.success(course.status === 'published' ? 'تم إلغاء النشر' : 'تم نشر المقرر')
      invalidate()
    },
  })

  const featureMutation = useMutation({
    mutationFn: (id) => api.post(`/courses/admin/${id}/feature`),
    onSuccess: () => { toast.success('تم تحديث التمييز'); invalidate() },
  })

  const duplicateMutation = useMutation({
    mutationFn: (id) => api.post(`/courses/admin/${id}/duplicate`),
    onSuccess: (res) => {
      toast.success('تم نسخ المقرر')
      invalidate()
      navigate(ROUTES.ADMIN_COURSE_EDIT.replace(':id', res.data.data._id))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/courses/admin/${id}`),
    onSuccess: () => { toast.success('تم الحذف'); setSelected([]); invalidate() },
  })

  const bulkMutation = useMutation({
    mutationFn: ({ ids, action }) => api.post('/courses/bulk', { ids, action }),
    onSuccess: (_, vars) => {
      const msgs = { publish: 'تم النشر', unpublish: 'تم إلغاء النشر', feature: 'تم التمييز', archive: 'تم الأرشفة', delete: 'تم الحذف' }
      toast.success(msgs[vars.action] || 'تم')
      setSelected([])
      invalidate()
    },
    onError: () => toast.error('حدث خطأ'),
  })

  // ── Handlers ──

  function handleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleSelectAll() {
    setSelected(prev => prev.length === courses.length ? [] : courses.map(c => c._id))
  }

  function handleDelete(course) {
    if (!window.confirm(`هل تريد حذف "${course.nameAr}"؟`)) return
    deleteMutation.mutate(course._id)
  }

  // Shared props factory
  const itemProps = (c) => ({
    course: c,
    selected: selected.includes(c._id),
    onSelect: handleSelect,
    onEdit: (id) => navigate(ROUTES.ADMIN_COURSE_EDIT.replace(':id', id)),
    onTogglePublish: publishMutation.mutate,
    onToggleFeature: (c) => featureMutation.mutate(c._id),
    onDuplicate: (c) => duplicateMutation.mutate(c._id),
    onDelete: handleDelete,
  })

  // Filter controls
  const selects = [
    {
      value: filterStatus, onChange: v => { setFilterStatus(v); setPage(1) },
      options: [
        { value: 'all', label: 'كل الحالات' }, { value: 'published', label: 'منشور' },
        { value: 'draft', label: 'مسودة' },    { value: 'archived',  label: 'أرشيف' },
      ],
    },
    {
      value: filterCategory, onChange: v => { setFilterCategory(v); setPage(1) },
      options: [
        { value: 'all',    label: 'كل الفئات' }, { value: 'tajweed', label: 'التجويد' },
        { value: 'hifz',   label: 'الحفظ' },     { value: 'nazra',   label: 'النظر'   },
        { value: 'arabic', label: 'العربية' },    { value: 'quran',   label: 'القرآن'  },
        { value: 'other',  label: 'أخرى' },
      ],
    },
    {
      value: filterDifficulty, onChange: v => { setFilterDifficulty(v); setPage(1) },
      options: [
        { value: 'all',          label: 'كل المستويات' },
        { value: 'beginner',     label: 'مبتدئ' },
        { value: 'intermediate', label: 'متوسط' },
        { value: 'advanced',     label: 'متقدم' },
      ],
    },
    {
      value: sort, onChange: v => { setSort(v); setPage(1) },
      options: [
        { value: 'newest',   label: 'الأحدث' },       { value: 'oldest',   label: 'الأقدم' },
        { value: 'students', label: 'الأكثر طلابًا' }, { value: 'alpha',    label: 'أبجدي'  },
      ],
    },
  ]

  return (
    <div dir="rtl" className="space-y-5 max-w-[1400px]">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">
            إدارة الدورات والمقررات
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats?.total || 0} مقرر • {stats?.totalStudents || 0} طالب مسجل
          </p>
        </div>
        <Link
          to={ROUTES.ADMIN_COURSE_NEW}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          دورة جديدة
        </Link>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard value={stats?.total}         label="إجمالي المقررات" color="#7c3aed" Icon={BookOpen}     />
        <StatCard value={stats?.published}     label="منشور"           color="#059669" Icon={CircleCheck}  />
        <StatCard value={stats?.draft}         label="مسودة"           color="#64748b" Icon={Pencil}       />
        <StatCard value={stats?.archived}      label="أرشيف"           color="#d97706" Icon={Archive}      />
        <StatCard value={stats?.featured}      label="مميز"            color="#b45309" Icon={Star}         />
        <StatCard value={stats?.totalStudents} label="الطلاب"          color="#2563eb" Icon={UserRound}    />
      </div>

      {/* ── Bulk Action Bar ── */}
      <AnimatePresence>
        {selected.length > 0 && (
          <BulkActionBar
            count={selected.length}
            onAction={(action) => bulkMutation.mutate({ ids: selected, action })}
            onClear={() => setSelected([])}
          />
        )}
      </AnimatePresence>

      {/* ── Toolbar ── */}
      <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="ابحث عن مقرر..."
            className="w-full py-2 pr-9 pl-3 rounded-xl text-sm bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
          />
        </div>

        {/* Filter selects */}
        {selects.map((sel, i) => (
          <select
            key={i}
            value={sel.value}
            onChange={e => sel.onChange(e.target.value)}
            className="py-2 px-3 rounded-xl text-sm bg-white border border-slate-200 text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all cursor-pointer"
          >
            {sel.options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1 mr-auto">
          {[
            {
              v: 'table',
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M3 10h18M3 14h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              v: 'grid',
              icon: (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <rect x="3"  y="3"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <rect x="14" y="3"  width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <rect x="3"  y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                  <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
              ),
            },
          ].map(btn => (
            <button
              key={btn.v}
              onClick={() => setView(btn.v)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                view === btn.v
                  ? 'bg-white shadow-sm text-violet-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner color="border-violet-500" />
        </div>
      ) : courses.length === 0 ? (
        /* Empty state */
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-violet-50">
            <BookOpen size={28} strokeWidth={1.6} color="#7c3aed" />
          </div>
          <p className="font-semibold text-lg text-slate-500">لا توجد دورات</p>
          <p className="text-sm text-slate-400">ابدأ بإضافة أول دورة تعليمية للمنصة</p>
          <Link
            to={ROUTES.ADMIN_COURSE_NEW}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors"
          >
            أضف أول دورة
          </Link>
        </div>
      ) : view === 'table' ? (
        /* ── Table View ── */
        <div className="bg-white border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
          <table className="w-full" dir="rtl">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selected.length === courses.length && courses.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 accent-violet-600 cursor-pointer"
                  />
                </th>
                {['الدورة', 'الفئة', 'المستوى', 'الحالة', 'الطلاب', 'مميز', 'إجراءات'].map(h => (
                  <th key={h} className="py-3 px-4 text-right text-xs font-semibold text-slate-500 tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map(c => (
                <CourseTableRow key={c._id} {...itemProps(c)} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {courses.map(c => (
            <CourseGridCard key={c._id} {...itemProps(c)} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {total} نتيجة • صفحة {page} من {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                  p === page
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
