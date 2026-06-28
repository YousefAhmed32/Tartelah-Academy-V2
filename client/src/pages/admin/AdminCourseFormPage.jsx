import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FileText, BookOpen, Target, Search, Star } from 'lucide-react'
import api from '../../utils/api.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'
import Spinner from '../../components/ui/Spinner.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractYouTubeId(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^&\n?#]+)/)
  return m ? m[1] : null
}

function youtubeThumbnail(url) {
  const id = extractYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

// ── Section Card ──────────────────────────────────────────────────────────────

function FormSection({ title, children, Icon }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(150,120,220,0.1)' }}>
      <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(150,120,220,0.08)', background: 'rgba(124,58,237,0.06)' }}>
        {Icon && <Icon size={18} strokeWidth={1.8} color="#9b7fd6" />}
        <h2 className="font-heading font-bold text-base text-white">{title}</h2>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  )
}

// ── Field Components ──────────────────────────────────────────────────────────

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-2" style={{ color: '#b3a4d0' }}>
        {label}{required && <span className="text-red-400 mr-1">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(150,120,220,0.18)',
  color: '#E7E0F5',
  borderRadius: '10px',
  outline: 'none',
  padding: '9px 12px',
  width: '100%',
  fontSize: '14px',
  fontFamily: 'inherit',
}

function TField({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="resize-none w-full text-sm transition-all"
      style={{ ...inputCls, padding: '10px 12px' }}
    />
  )
}

// ── Tags Input ────────────────────────────────────────────────────────────────

function TagsInput({ tags, onChange }) {
  const [input, setInput] = useState('')

  function add() {
    const v = input.trim().toLowerCase()
    if (!v || tags.includes(v)) { setInput(''); return }
    onChange([...tags, v])
    setInput('')
  }

  return (
    <div className="rounded-xl p-2 min-h-[44px] flex flex-wrap gap-1.5 items-center" style={inputCls}>
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(124,58,237,0.2)', color: '#a78fd6' }}>
          {tag}
          <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} style={{ color: '#8b7aad', marginRight: '2px' }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        placeholder={tags.length === 0 ? 'اكتب وسمًا واضغط Enter' : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
        style={{ color: '#E7E0F5', fontSize: '13px' }}
      />
    </div>
  )
}

// ── Dynamic List Input ────────────────────────────────────────────────────────

function DynamicList({ items, onChange, placeholder, label, addLabel }) {
  const [input, setInput] = useState('')

  function add() {
    const v = input.trim()
    if (!v) return
    onChange([...items, v])
    setInput('')
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-none text-[10px] font-bold" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78fd6' }}>{i + 1}</div>
          <input
            value={item}
            onChange={e => { const next = [...items]; next[i] = e.target.value; onChange(next) }}
            className="flex-1 text-sm px-3 py-2 rounded-xl outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(150,120,220,0.14)', color: '#E7E0F5' }}
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-none"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(150,120,220,0.2)', color: '#E7E0F5' }}
        />
        <button type="button" onClick={add}
          className="px-3 py-2 rounded-xl text-xs font-semibold flex-none transition-colors"
          style={{ background: 'rgba(124,58,237,0.15)', color: '#a78fd6' }}>
          + {addLabel || 'إضافة'}
        </button>
      </div>
    </div>
  )
}

// ── Curriculum Builder ────────────────────────────────────────────────────────

function CurriculumBuilder({ sections, onChange }) {
  function addSection() {
    onChange([...sections, { sectionTitleAr: '', sectionTitle: '', lessons: [] }])
  }

  function updateSection(i, field, value) {
    const next = [...sections]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  function removeSection(i) {
    onChange(sections.filter((_, j) => j !== i))
  }

  function addLesson(sectionIdx) {
    const next = [...sections]
    next[sectionIdx] = { ...next[sectionIdx], lessons: [...next[sectionIdx].lessons, ''] }
    onChange(next)
  }

  function updateLesson(sectionIdx, lessonIdx, value) {
    const next = [...sections]
    const lessons = [...next[sectionIdx].lessons]
    lessons[lessonIdx] = value
    next[sectionIdx] = { ...next[sectionIdx], lessons }
    onChange(next)
  }

  function removeLesson(sectionIdx, lessonIdx) {
    const next = [...sections]
    next[sectionIdx] = { ...next[sectionIdx], lessons: next[sectionIdx].lessons.filter((_, j) => j !== lessonIdx) }
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {sections.map((sec, i) => (
        <div key={i} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(150,120,220,0.14)', background: 'rgba(124,58,237,0.04)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(150,120,220,0.1)' }}>
            <span className="text-xs font-bold text-purple-400">وحدة {i + 1}</span>
            <input
              value={sec.sectionTitleAr}
              onChange={e => updateSection(i, 'sectionTitleAr', e.target.value)}
              placeholder="عنوان الوحدة بالعربية"
              className="flex-1 bg-transparent outline-none text-sm font-semibold text-white"
            />
            <button onClick={() => removeSection(i)} className="text-red-400 hover:text-red-300 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="p-3 space-y-2">
            {sec.lessons.map((lesson, j) => (
              <div key={j} className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="flex-none"><path d="M9 18V5l12-2v13" stroke="#b3a4d0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <input
                  value={lesson}
                  onChange={e => updateLesson(i, j, e.target.value)}
                  placeholder={`درس ${j + 1}`}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: '#E7E0F5', borderBottom: '1px solid rgba(150,120,220,0.1)', padding: '4px 0' }}
                />
                <button onClick={() => removeLesson(i, j)} style={{ color: '#6b5f8a' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            ))}
            <button onClick={() => addLesson(i)}
              className="text-xs font-semibold transition-colors mt-1 flex items-center gap-1"
              style={{ color: '#8b7aad' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              إضافة درس
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addSection}
        className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        style={{ border: '1px dashed rgba(124,58,237,0.3)', color: '#8b7aad', background: 'rgba(124,58,237,0.04)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        إضافة وحدة
      </button>
    </div>
  )
}

// ── Image Upload Panel ────────────────────────────────────────────────────────

function ImageUploadPanel({ title, currentUrl, onUploaded, endpoint, field }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  async function handleFile(file) {
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append(field, file)
    try {
      const { data } = await api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onUploaded(data.data[field === 'thumbnail' ? 'thumbnailImage' : 'coverImage'])
      toast.success('تم الرفع')
    } catch {
      toast.error('فشل الرفع')
    } finally {
      setUploading(false)
    }
  }

  const imgUrl = getFileUrl(currentUrl)

  return (
    <div>
      <div className="text-xs font-semibold mb-2" style={{ color: '#b3a4d0' }}>{title}</div>
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer flex items-center justify-center"
        style={{ height: '130px', background: 'rgba(124,58,237,0.06)', border: '1px dashed rgba(150,120,220,0.25)' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
      >
        {uploading ? (
          <Spinner size="sm" color="border-purple-500" />
        ) : imgUrl ? (
          <>
            <img src={imgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <span className="text-white text-xs font-semibold">تغيير الصورة</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#8b7aad" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="text-xs" style={{ color: '#8b7aad' }}>اسحب أو اضغط للرفع</span>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>
    </div>
  )
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-all flex-none"
        style={{ background: checked ? '#7c3aed' : 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? '26px' : '4px' }}
        />
      </div>
      <span className="text-sm" style={{ color: '#E7E0F5' }}>{label}</span>
    </label>
  )
}

// ── Initial Form State ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  nameAr: '', name: '',
  shortDescriptionAr: '', shortDescription: '',
  descriptionAr: '', description: '',
  thumbnailImage: '', coverImage: '',
  introVideoUrl: '',
  category: 'other', subCategory: '', tags: [], language: 'ar',
  instructor: '',
  difficulty: 'beginner', ageGroup: 'adults',
  estimatedDuration: '', lessonsCount: '', durationWeeks: 12,
  learningOutcomesAr: [], learningOutcomes: [],
  requirementsAr: [], requirements: [],
  targetAudienceAr: '', targetAudience: '',
  curriculum: [],
  order: 0, featured: false,
  status: 'draft', enrollmentEnabled: true, certificateAvailable: false,
  seo: { title: '', description: '', keywords: [] },
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminCourseFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isNew = !id

  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [unsaved, setUnsaved] = useState(false)
  const [videoPreview, setVideoPreview] = useState(false)

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ['admin', 'course', id],
    queryFn: () => api.get(`/courses/admin/${id}`).then(r => r.data.data),
    enabled: !!id,
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin', 'teachers-list'],
    queryFn: () => api.get('/teachers', { params: { limit: 100 } }).then(r => r.data.data || r.data),
    staleTime: 300_000,
  })

  useEffect(() => {
    if (course) {
      setForm({
        nameAr: course.nameAr || '',
        name: course.name || '',
        shortDescriptionAr: course.shortDescriptionAr || '',
        shortDescription: course.shortDescription || '',
        descriptionAr: course.descriptionAr || '',
        description: course.description || '',
        thumbnailImage: course.thumbnailImage || '',
        coverImage: course.coverImage || '',
        introVideoUrl: course.introVideoUrl || '',
        category: course.category || 'other',
        subCategory: course.subCategory || '',
        tags: course.tags || [],
        language: course.language || 'ar',
        instructor: course.instructor?._id || course.instructor || '',
        difficulty: course.difficulty || 'beginner',
        ageGroup: course.ageGroup || 'adults',
        estimatedDuration: course.estimatedDuration || '',
        lessonsCount: course.lessonsCount || '',
        durationWeeks: course.durationWeeks || 12,
        learningOutcomesAr: course.learningOutcomesAr || [],
        learningOutcomes: course.learningOutcomes || [],
        requirementsAr: course.requirementsAr || [],
        requirements: course.requirements || [],
        targetAudienceAr: course.targetAudienceAr || '',
        targetAudience: course.targetAudience || '',
        curriculum: course.curriculum || [],
        order: course.order || 0,
        featured: !!course.featured,
        status: course.status || 'draft',
        enrollmentEnabled: course.enrollmentEnabled !== false,
        certificateAvailable: !!course.certificateAvailable,
        seo: course.seo || { title: '', description: '', keywords: [] },
      })
    }
  }, [course])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setUnsaved(true)
    setSaved(false)
  }

  function setSeo(field, value) {
    setForm(prev => ({ ...prev, seo: { ...prev.seo, [field]: value } }))
    setUnsaved(true)
  }

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/courses', data),
    onSuccess: (res) => {
      setSaved(true); setUnsaved(false)
      toast.success('تم إنشاء المقرر')
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      navigate(ROUTES.ADMIN_COURSE_EDIT.replace(':id', res.data.data._id))
    },
    onError: err => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/courses/admin/${id}`, data),
    onSuccess: () => {
      setSaved(true); setUnsaved(false)
      toast.success('تم الحفظ')
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      qc.invalidateQueries({ queryKey: ['admin', 'course', id] })
    },
    onError: err => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  async function handleSave() {
    if (!form.nameAr.trim()) { toast.error('اسم المقرر مطلوب'); return }
    setSaving(true)
    const payload = {
      ...form,
      estimatedDuration: form.estimatedDuration ? Number(form.estimatedDuration) : 0,
      lessonsCount: form.lessonsCount ? Number(form.lessonsCount) : 0,
      durationWeeks: form.durationWeeks ? Number(form.durationWeeks) : 12,
      order: Number(form.order) || 0,
      instructor: form.instructor || null,
    }
    try {
      if (isNew) {
        await createMutation.mutateAsync(payload)
      } else {
        await updateMutation.mutateAsync(payload)
      }
    } finally {
      setSaving(false)
    }
  }

  const ytThumb = youtubeThumbnail(form.introVideoUrl)
  const ytId = extractYouTubeId(form.introVideoUrl)

  if (!isNew && loadingCourse) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner color="border-purple-500" />
      </div>
    )
  }

  return (
    <div dir="rtl" className="max-w-[1200px] space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs mb-2" style={{ color: '#8b7aad' }}>
            <Link to={ROUTES.ADMIN_COURSES} className="hover:text-purple-300 transition-colors">المقررات</Link>
            <span>›</span>
            <span style={{ color: '#b3a4d0' }}>{isNew ? 'دورة جديدة' : (form.nameAr || 'تعديل')}</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-white">
            {isNew ? 'إنشاء دورة جديدة' : 'تعديل الدورة'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Save indicator */}
          <AnimatePresence>
            {saved && !unsaved && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs" style={{ color: '#10b981' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                تم الحفظ
              </motion.div>
            )}
          </AnimatePresence>
          {unsaved && (
            <span className="text-xs" style={{ color: '#f59e0b' }}>• تغييرات غير محفوظة</span>
          )}

          {/* Status badge */}
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            className="py-2 px-3 rounded-xl text-xs font-bold outline-none cursor-pointer"
            style={{
              background: form.status === 'published' ? 'rgba(16,185,129,0.15)' : form.status === 'archived' ? 'rgba(245,158,11,0.15)' : 'rgba(156,163,175,0.15)',
              color: form.status === 'published' ? '#10b981' : form.status === 'archived' ? '#f59e0b' : '#9ca3af',
              border: '1px solid transparent',
            }}
          >
            <option value="draft" style={{ background: '#1d0a3f', color: '#E7E0F5' }}>مسودة</option>
            <option value="published" style={{ background: '#1d0a3f', color: '#E7E0F5' }}>منشور</option>
            <option value="archived" style={{ background: '#1d0a3f', color: '#E7E0F5' }}>أرشيف</option>
          </select>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', boxShadow: '0 8px 20px rgba(124,58,237,0.4)' }}
          >
            {saving ? <Spinner size="sm" color="border-white" /> : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
            حفظ
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Basic Info */}
          <FormSection title="المعلومات الأساسية" Icon={FileText}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="اسم الدورة بالعربية" required>
                <input
                  value={form.nameAr}
                  onChange={e => set('nameAr', e.target.value)}
                  placeholder="مثال: دورة التجويد المتكامل"
                  style={inputCls}
                  className="transition-all"
                />
              </Field>
              <Field label="Course Name (English)">
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Complete Tajweed Course"
                  style={{ ...inputCls, direction: 'ltr' }}
                  className="transition-all"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="وصف مختصر بالعربية">
                <TField
                  value={form.shortDescriptionAr}
                  onChange={e => set('shortDescriptionAr', e.target.value)}
                  placeholder="وصف قصير يظهر في قائمة الدورات..."
                  rows={3}
                />
              </Field>
              <Field label="Short Description (English)">
                <TField
                  value={form.shortDescription}
                  onChange={e => set('shortDescription', e.target.value)}
                  placeholder="Short description shown in course listings..."
                  rows={3}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="الفئة">
                <select value={form.category} onChange={e => set('category', e.target.value)} style={inputCls} className="cursor-pointer">
                  {[['tajweed','التجويد'],['hifz','الحفظ'],['nazra','النظر'],['arabic','العربية'],['quran','القرآن'],['other','أخرى']].map(([v,l]) =>
                    <option key={v} value={v} style={{ background: '#1d0a3f' }}>{l}</option>)}
                </select>
              </Field>
              <Field label="المستوى">
                <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} style={inputCls} className="cursor-pointer">
                  {[['beginner','مبتدئ'],['intermediate','متوسط'],['advanced','متقدم']].map(([v,l]) =>
                    <option key={v} value={v} style={{ background: '#1d0a3f' }}>{l}</option>)}
                </select>
              </Field>
              <Field label="الفئة العمرية">
                <select value={form.ageGroup} onChange={e => set('ageGroup', e.target.value)} style={inputCls} className="cursor-pointer">
                  {[['children','أطفال'],['teens','مراهقون'],['adults','بالغون']].map(([v,l]) =>
                    <option key={v} value={v} style={{ background: '#1d0a3f' }}>{l}</option>)}
                </select>
              </Field>
              <Field label="اللغة">
                <select value={form.language} onChange={e => set('language', e.target.value)} style={inputCls} className="cursor-pointer">
                  {[['ar','العربية'],['en','English'],['both','الاثنان']].map(([v,l]) =>
                    <option key={v} value={v} style={{ background: '#1d0a3f' }}>{l}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="فئة فرعية (اختياري)">
                <input
                  value={form.subCategory}
                  onChange={e => set('subCategory', e.target.value)}
                  placeholder="مثال: أحكام النون الساكنة"
                  style={inputCls}
                  className="transition-all"
                />
              </Field>
              <Field label="المعلم">
                <select value={form.instructor} onChange={e => set('instructor', e.target.value)} style={inputCls} className="cursor-pointer">
                  <option value="" style={{ background: '#1d0a3f' }}>اختر معلمًا (اختياري)</option>
                  {teachers.map(t => (
                    <option key={t._id || t.userId} value={t._id || t.userId} style={{ background: '#1d0a3f' }}>
                      {t.firstNameAr || t.firstName} {t.lastNameAr || t.lastName}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="الوسوم (Tags)">
              <TagsInput tags={form.tags} onChange={v => set('tags', v)} />
            </Field>
          </FormSection>

          {/* Full Description */}
          <FormSection title="الوصف التفصيلي" Icon={BookOpen}>
            <Field label="الوصف الكامل بالعربية">
              <TField
                value={form.descriptionAr}
                onChange={e => set('descriptionAr', e.target.value)}
                placeholder="وصف مفصل للدورة، أهدافها، وما سيتعلمه الطالب..."
                rows={7}
              />
            </Field>
            <Field label="Full Description (English)">
              <TField
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Detailed course description, goals, and what the student will learn..."
                rows={7}
              />
            </Field>
          </FormSection>

          {/* Educational Content */}
          <FormSection title="المحتوى التعليمي" Icon={Target}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="ماذا سيتعلم الطالب (بالعربية)">
                <DynamicList
                  items={form.learningOutcomesAr}
                  onChange={v => set('learningOutcomesAr', v)}
                  placeholder="أضف مخرج تعليمي..."
                  addLabel="إضافة"
                />
              </Field>
              <Field label="المتطلبات المسبقة (بالعربية)">
                <DynamicList
                  items={form.requirementsAr}
                  onChange={v => set('requirementsAr', v)}
                  placeholder="أضف متطلبًا..."
                  addLabel="إضافة"
                />
              </Field>
            </div>

            <Field label="لمن هذه الدورة؟ (بالعربية)">
              <TField
                value={form.targetAudienceAr}
                onChange={e => set('targetAudienceAr', e.target.value)}
                placeholder="صف الطالب المثالي لهذه الدورة..."
                rows={3}
              />
            </Field>

            <Field label="المنهج الدراسي (الوحدات والدروس)">
              <CurriculumBuilder sections={form.curriculum} onChange={v => set('curriculum', v)} />
            </Field>
          </FormSection>

          {/* SEO */}
          <FormSection title="تحسين محركات البحث (SEO)" Icon={Search}>
            <Field label="عنوان SEO">
              <input
                value={form.seo.title}
                onChange={e => setSeo('title', e.target.value)}
                placeholder="عنوان مخصص لمحركات البحث (يترك فارغًا لاستخدام اسم المقرر)"
                style={inputCls}
                className="transition-all"
              />
              <div className="text-xs mt-1" style={{ color: '#6b5f8a' }}>{form.seo.title.length}/200 حرف</div>
            </Field>
            <Field label="وصف SEO">
              <TField
                value={form.seo.description}
                onChange={e => setSeo('description', e.target.value)}
                placeholder="وصف مخصص لمحركات البحث..."
                rows={3}
              />
              <div className="text-xs mt-1" style={{ color: '#6b5f8a' }}>{form.seo.description.length}/500 حرف</div>
            </Field>
            <Field label="الكلمات المفتاحية">
              <TagsInput
                tags={form.seo.keywords || []}
                onChange={v => setSeo('keywords', v)}
              />
            </Field>
          </FormSection>
        </div>

        {/* ── RIGHT COLUMN (sticky sidebar) ── */}
        <div className="space-y-4 xl:sticky xl:top-6">

          {/* Thumbnail */}
          {!isNew && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(150,120,220,0.1)' }}>
              <div className="font-heading font-bold text-sm text-white">الصور</div>
              <ImageUploadPanel
                title="الصورة المصغرة"
                currentUrl={form.thumbnailImage}
                onUploaded={url => set('thumbnailImage', url)}
                endpoint={`/courses/admin/${id}/thumbnail`}
                field="thumbnail"
              />
              <ImageUploadPanel
                title="صورة الغلاف (Banner)"
                currentUrl={form.coverImage}
                onUploaded={url => set('coverImage', url)}
                endpoint={`/courses/admin/${id}/cover`}
                field="cover"
              />
            </div>
          )}
          {isNew && (
            <div className="rounded-2xl p-4" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div className="flex items-start gap-3">
                <svg className="flex-none mt-0.5" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#a78fd6" strokeWidth="1.8"/><path d="M12 8v4M12 16h.01" stroke="#a78fd6" strokeWidth="2" strokeLinecap="round"/></svg>
                <p className="text-xs leading-relaxed" style={{ color: '#a78fd6' }}>
                  يمكنك رفع الصور بعد إنشاء الدورة. احفظ المعلومات الأساسية أولاً ثم أضف الصور.
                </p>
              </div>
            </div>
          )}

          {/* Intro Video */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(150,120,220,0.1)' }}>
            <div className="font-heading font-bold text-sm text-white">الفيديو التعريفي</div>
            <Field label="رابط YouTube">
              <input
                value={form.introVideoUrl}
                onChange={e => { set('introVideoUrl', e.target.value); setVideoPreview(false) }}
                placeholder="https://youtube.com/watch?v=..."
                style={{ ...inputCls, direction: 'ltr', fontSize: '12px' }}
                className="transition-all"
              />
            </Field>
            {ytThumb && (
              <div className="relative rounded-xl overflow-hidden cursor-pointer" style={{ height: '120px' }} onClick={() => setVideoPreview(true)}>
                <img src={ytThumb} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,0,0,0.85)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="m5 3 14 9-14 9V3Z"/></svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Publishing */}
          <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(150,120,220,0.1)' }}>
            <div className="font-heading font-bold text-sm text-white">الإعدادات</div>
            <Toggle checked={form.featured} onChange={v => set('featured', v)} label="مقرر مميز" />
            <Toggle checked={form.enrollmentEnabled} onChange={v => set('enrollmentEnabled', v)} label="التسجيل مفتوح" />
            <Toggle checked={form.certificateAvailable} onChange={v => set('certificateAvailable', v)} label="شهادة إتمام متاحة" />
            <div className="pt-2" style={{ borderTop: '1px solid rgba(150,120,220,0.1)' }}>
              <Field label="ترتيب العرض">
                <input
                  type="number"
                  value={form.order}
                  onChange={e => set('order', e.target.value)}
                  min="0"
                  style={inputCls}
                  className="transition-all"
                />
              </Field>
            </div>
          </div>

          {/* Academic Info */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(150,120,220,0.1)' }}>
            <div className="font-heading font-bold text-sm text-white">المعلومات الأكاديمية</div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="المدة (ساعة)">
                <input type="number" min="0" value={form.estimatedDuration} onChange={e => set('estimatedDuration', e.target.value)} style={{ ...inputCls, padding: '7px 8px', fontSize: '13px' }} className="transition-all" />
              </Field>
              <Field label="عدد الدروس">
                <input type="number" min="0" value={form.lessonsCount} onChange={e => set('lessonsCount', e.target.value)} style={{ ...inputCls, padding: '7px 8px', fontSize: '13px' }} className="transition-all" />
              </Field>
              <Field label="المدة (أسبوع)">
                <input type="number" min="1" value={form.durationWeeks} onChange={e => set('durationWeeks', e.target.value)} style={{ ...inputCls, padding: '7px 8px', fontSize: '13px' }} className="transition-all" />
              </Field>
            </div>
          </div>

          {/* Slug info */}
          {!isNew && course?.slug && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(150,120,220,0.08)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#6b5f8a" strokeWidth="1.8"/><path d="M9 12h6M12 9l3 3-3 3" stroke="#6b5f8a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="text-[11px] font-mono break-all" style={{ color: '#6b5f8a' }}>
                /courses/{course.slug}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* YouTube Modal */}
      <AnimatePresence>
        {videoPreview && ytId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            onClick={() => setVideoPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-3xl rounded-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                className="w-full aspect-video"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
