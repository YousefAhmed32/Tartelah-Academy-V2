import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FileText, BookOpen, Target, Search, Info, ChevronLeft, Upload, Save, X, Plus, Link2, WandSparkles } from 'lucide-react'
import api from '../../utils/api.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'
import Spinner from '../../components/ui/Spinner.jsx'
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx'
import { extractYouTubeId, youtubeThumbnail, youtubeEmbedUrl, isValidYouTubeUrl } from '../../utils/youtube.js'

// ── Shared design-language primitives ────────────────────────────────────────

const inputCls = 'w-full text-sm px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-100'
const selectCls = `${inputCls} cursor-pointer`

// ── Section Card ──────────────────────────────────────────────────────────────

function FormSection({ title, children, Icon }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
      <div className="px-5 py-4 flex items-center gap-3 bg-slate-50 border-b border-slate-200">
        {Icon && (
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-none bg-violet-100">
            <Icon size={16} strokeWidth={1.8} className="text-violet-600" />
          </span>
        )}
        <h2 className="font-heading font-extrabold text-lg text-slate-900">{title}</h2>
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
      <label className="block text-xs font-semibold mb-1.5 text-slate-600">
        {label}{required && <span className="text-red-600 mr-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function TField({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className={`${inputCls} resize-none py-2.5`}
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
    <div className="rounded-xl p-2 min-h-[44px] flex flex-wrap gap-1.5 items-center bg-white border border-slate-200 transition-all focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter(t => t !== tag))} className="text-violet-400 hover:text-violet-700 transition-colors leading-none">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        placeholder={tags.length === 0 ? 'اكتب وسمًا واضغط Enter' : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
      />
    </div>
  )
}

// ── Dynamic List Input ────────────────────────────────────────────────────────

function DynamicList({ items, onChange, placeholder, addLabel }) {
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
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-none text-[10px] font-bold bg-violet-100 text-violet-700">{i + 1}</div>
          <input
            value={item}
            onChange={e => { const next = [...items]; next[i] = e.target.value; onChange(next) }}
            className={`${inputCls} flex-1 py-2`}
          />
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-none bg-red-50 text-red-600 hover:bg-red-100">
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className={`${inputCls} flex-1 py-2 border-dashed`}
        />
        <button type="button" onClick={add}
          className="px-3.5 py-2 rounded-xl text-xs font-bold flex-none transition-colors bg-violet-50 text-violet-700 hover:bg-violet-100 flex items-center gap-1">
          <Plus size={13} strokeWidth={2.5} /> {addLabel || 'إضافة'}
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
        <div key={i} className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white">
            <span className="text-xs font-extrabold text-violet-600 flex-none">وحدة {i + 1}</span>
            <input
              value={sec.sectionTitleAr}
              onChange={e => updateSection(i, 'sectionTitleAr', e.target.value)}
              placeholder="عنوان الوحدة بالعربية"
              className="flex-1 bg-transparent outline-none text-sm font-semibold text-slate-900 placeholder-slate-400"
            />
            <button onClick={() => removeSection(i)} className="text-red-500 hover:text-red-600 transition-colors flex-none">
              <X size={15} strokeWidth={2} />
            </button>
          </div>
          <div className="p-3 space-y-2">
            {sec.lessons.map((lesson, j) => (
              <div key={j} className="flex items-center gap-2">
                <FileText size={13} strokeWidth={1.8} className="flex-none text-slate-400" />
                <input
                  value={lesson}
                  onChange={e => updateLesson(i, j, e.target.value)}
                  placeholder={`درس ${j + 1}`}
                  className="flex-1 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400 border-b border-slate-200 focus:border-violet-400 transition-colors py-1"
                />
                <button onClick={() => removeLesson(i, j)} className="text-slate-300 hover:text-red-500 transition-colors flex-none">
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ))}
            <button onClick={() => addLesson(i)}
              className="text-xs font-semibold transition-colors mt-1 flex items-center gap-1 text-violet-600 hover:text-violet-700">
              <Plus size={12} strokeWidth={2.5} />
              إضافة درس
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addSection}
        className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border border-dashed border-violet-300 text-violet-600 bg-violet-50/60 hover:bg-violet-50 hover:border-violet-400"
      >
        <Plus size={14} strokeWidth={2.5} />
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
      <div className="text-xs font-semibold mb-2 text-slate-600">{title}</div>
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer flex items-center justify-center transition-colors bg-slate-50 border border-dashed border-slate-300 hover:border-violet-400 hover:bg-violet-50/50"
        style={{ height: '130px' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
      >
        {uploading ? (
          <Spinner size="sm" color="border-violet-600" />
        ) : imgUrl ? (
          <>
            <img src={imgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ background: 'rgba(15,23,42,0.55)' }}>
              <span className="text-white text-xs font-semibold">تغيير الصورة</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <Upload size={22} strokeWidth={1.6} className="text-slate-400" />
            <span className="text-xs text-slate-500">اسحب أو اضغط للرفع</span>
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
        className={`relative w-11 h-6 rounded-full transition-all flex-none ${checked ? 'bg-violet-600' : 'bg-slate-200'}`}
      >
        <div
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? '26px' : '4px' }}
        />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

// ── Sidebar Card ──────────────────────────────────────────────────────────────

function SideCard({ title, children }) {
  return (
    <div className="rounded-2xl p-4 space-y-3 bg-white border border-slate-200 shadow-sm">
      <div className="font-heading font-extrabold text-sm text-slate-900">{title}</div>
      {children}
    </div>
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

const STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-green-50 text-green-700',
  archived: 'bg-amber-50 text-amber-700',
}

// ── Demo Content Generator (dev/testing helper) ──────────────────────────────
// A single realistic, coherent sample course used to quickly populate the
// form for manual QA. Kept as plain data (not inline in the button handler)
// so it stays readable and easy to extend with more presets later.

const DEMO_CURRICULUM = [
  {
    sectionTitleAr: 'مدخل إلى علم التجويد',
    sectionTitle: 'Introduction to Tajweed',
    lessons: ['مفهوم التجويد وأهميته', 'مراتب القراءة', 'اللحن الجلي واللحن الخفي'],
  },
  {
    sectionTitleAr: 'مخارج الحروف وصفاتها',
    sectionTitle: 'Articulation Points and Letter Characteristics',
    lessons: ['مقدمة في مخارج الحروف', 'المخارج الرئيسية', 'صفات الحروف الأساسية', 'تدريبات عملية على النطق'],
  },
  {
    sectionTitleAr: 'أحكام النون الساكنة والتنوين',
    sectionTitle: 'Rules of Noon Sakinah and Tanween',
    lessons: ['الإظهار', 'الإدغام', 'الإقلاب', 'الإخفاء'],
  },
  {
    sectionTitleAr: 'أحكام المدود',
    sectionTitle: 'Rules of Madd (Elongation)',
    lessons: ['المد الطبيعي', 'المد المتصل والمنفصل', 'المد اللازم', 'تطبيقات عملية'],
  },
  {
    sectionTitleAr: 'التطبيق العملي',
    sectionTitle: 'Practical Application',
    lessons: ['تحليل تلاوات مختارة', 'تصحيح الأخطاء الشائعة', 'تدريب نهائي', 'تقييم مستوى الطالب'],
  },
]

const DEMO_COURSE_DATA = {
  nameAr: 'دورة التجويد المتكامل',
  name: 'Complete Tajweed Course',
  shortDescriptionAr: 'دورة تعليمية متكاملة لإتقان أحكام التجويد وتطبيقها عمليًا أثناء تلاوة القرآن الكريم.',
  shortDescription: 'A comprehensive course designed to help students master Tajweed rules and apply them accurately during Quran recitation.',
  descriptionAr: 'تهدف هذه الدورة إلى تمكين الطالب من إتقان أحكام التجويد بشكل تدريجي ومتكامل، بدءًا من الأساسيات النظرية وصولًا إلى التطبيق العملي أثناء التلاوة. تعتمد الدورة على منهجية تجمع بين الشرح المبسط لمخارج الحروف وصفاتها، وأحكام النون الساكنة والتنوين، وأنواع المدود، مع تدريبات صوتية وتطبيقات مباشرة على آيات مختارة من القرآن الكريم. يحرص المحتوى التعليمي على ربط كل قاعدة نظرية بتطبيق عملي فوري، بحيث يلاحظ الطالب تحسّنًا ملموسًا في جودة تلاوته خطوة بخطوة. وبنهاية الدورة، يكون الطالب قادرًا على تلاوة القرآن الكريم بأحكام تجويد صحيحة، والتمييز بين الأخطاء الشائعة وتصحيحها بثقة واستقلالية.',
  description: 'This course is designed to help students master the rules of Tajweed in a gradual and integrated manner, starting from theoretical foundations and progressing to practical application during recitation. The curriculum combines clear explanations of articulation points, letter characteristics, the rules of Noon Sakinah and Tanween, and the different types of Madd, paired with audio exercises and direct application on selected Quranic verses. Each theoretical rule is immediately reinforced with hands-on practice, allowing students to observe tangible improvement in their recitation quality step by step. By the end of the course, students will be able to recite the Quran with correct Tajweed rules, confidently identify common mistakes, and correct them independently.',
  category: 'tajweed',
  subCategory: 'أحكام التجويد وتطبيقاتها العملية',
  tags: ['التجويد', 'القرآن', 'تلاوة', 'أحكام التجويد', 'تعليم القرآن'],
  language: 'ar',
  difficulty: 'beginner',
  ageGroup: 'adults',
  estimatedDuration: 24,
  durationWeeks: 8,
  learningOutcomesAr: [
    'إتقان مخارج الحروف وصفاتها الأساسية',
    'تطبيق أحكام النون الساكنة والتنوين',
    'التمييز بين أنواع المدود وتطبيقها',
    'تحسين جودة التلاوة وتقليل الأخطاء الشائعة',
    'قراءة آيات مختارة مع تطبيق أحكام التجويد عمليًا',
  ],
  learningOutcomes: [
    'Master the articulation points (makharij) and basic characteristics of letters',
    'Apply the rules of Noon Sakinah and Tanween correctly',
    'Distinguish between types of Madd and apply them properly',
    'Improve recitation quality and reduce common mistakes',
    'Recite selected verses while practically applying Tajweed rules',
  ],
  requirementsAr: [
    'القدرة الأساسية على قراءة القرآن الكريم',
    'الالتزام بحضور الدروس والتدريب المنتظم',
    'توفر مصحف للتطبيق العملي',
    'لا يشترط دراسة سابقة متقدمة في التجويد',
  ],
  requirements: [
    'Basic ability to read the Quran',
    'Commitment to attending lessons and regular practice',
    'Access to a Mushaf for practical application',
    'No advanced prior study of Tajweed required',
  ],
  targetAudienceAr: 'هذه الدورة مناسبة لكل من يرغب في إتقان أحكام التجويد، سواء كان مبتدئًا يسعى لتصحيح تلاوته أو دارسًا يرغب في تعميق فهمه لأحكام القراءة الصحيحة، دون اشتراط خبرة سابقة متقدمة.',
  targetAudience: 'This course is suitable for anyone who wants to master the rules of Tajweed, whether a beginner looking to correct their recitation or a student seeking a deeper understanding of proper recitation rules, with no advanced prior experience required.',
  featured: true,
  status: 'draft',
  enrollmentEnabled: true,
  certificateAvailable: true,
  seo: {
    title: 'دورة التجويد المتكامل | تعلم أحكام التجويد',
    description: 'تعلم أحكام التجويد خطوة بخطوة من خلال دورة تعليمية متكاملة تجمع بين الشرح النظري والتطبيق العملي.',
    keywords: ['تعلم التجويد', 'دورة تجويد', 'أحكام التجويد', 'تعليم القرآن', 'تلاوة القرآن'],
  },
}

// Builds a safe copy of the demo course, preserving anything on the current
// form that must never be fabricated (uploaded images, a real intro video
// URL, an already-chosen instructor, display order).
function createDemoCourseData(currentForm, teachers) {
  const curriculum = DEMO_CURRICULUM.map(section => ({ ...section, lessons: [...section.lessons] }))
  const lessonsCount = curriculum.reduce((sum, section) => sum + section.lessons.length, 0)
  const firstTeacherId = teachers?.[0] ? (teachers[0]._id || teachers[0].userId) : ''

  return {
    ...DEMO_COURSE_DATA,
    tags: [...DEMO_COURSE_DATA.tags],
    learningOutcomesAr: [...DEMO_COURSE_DATA.learningOutcomesAr],
    learningOutcomes: [...DEMO_COURSE_DATA.learningOutcomes],
    requirementsAr: [...DEMO_COURSE_DATA.requirementsAr],
    requirements: [...DEMO_COURSE_DATA.requirements],
    seo: { ...DEMO_COURSE_DATA.seo, keywords: [...DEMO_COURSE_DATA.seo.keywords] },
    curriculum,
    lessonsCount,
    // Never fabricated — always carried over from whatever the form already had.
    thumbnailImage: currentForm.thumbnailImage,
    coverImage: currentForm.coverImage,
    introVideoUrl: currentForm.introVideoUrl,
    instructor: currentForm.instructor || firstTeacherId,
    order: currentForm.order,
  }
}

// A fresh/empty-ish form shouldn't trigger a "replace your data?" prompt —
// only real, user-authored content should. Default select values (category,
// language, difficulty, ageGroup, durationWeeks, status) don't count.
function hasMeaningfulCourseContent(form) {
  return Boolean(
    form.nameAr.trim() || form.name.trim() ||
    form.shortDescriptionAr.trim() || form.shortDescription.trim() ||
    form.descriptionAr.trim() || form.description.trim() ||
    form.targetAudienceAr.trim() || form.targetAudience.trim() ||
    form.tags.length || form.learningOutcomesAr.length || form.learningOutcomes.length ||
    form.requirementsAr.length || form.requirements.length || form.curriculum.length ||
    form.seo.title.trim() || form.seo.description.trim() || (form.seo.keywords || []).length
  )
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
  const [confirmDemoFill, setConfirmDemoFill] = useState(false)

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
      // Targeted, not app-wide: a course can be created already published
      // (status is choosable before the first save), so the public list/
      // detail caches may need to reflect it immediately too.
      qc.invalidateQueries({ queryKey: ['public', 'courses'] })
      qc.invalidateQueries({ queryKey: ['public', 'course'] })
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
      // Same reasoning as create — an edit (video, status, or otherwise)
      // must not leave a stale public list/detail cache in the same session.
      qc.invalidateQueries({ queryKey: ['public', 'courses'] })
      qc.invalidateQueries({ queryKey: ['public', 'course'] })
    },
    onError: err => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  async function handleSave() {
    if (!form.nameAr.trim()) { toast.error('اسم المقرر مطلوب'); return }
    if (!isValidYouTubeUrl(form.introVideoUrl)) {
      toast.error('رابط الفيديو التعريفي غير صالح. يُسمح بروابط YouTube فقط')
      return
    }
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

  function applyDemoContent() {
    setForm(prev => createDemoCourseData(prev, teachers))
    setUnsaved(true)
    setSaved(false)
    setConfirmDemoFill(false)
    toast.success('تمت إضافة محتوى تجريبي')
  }

  function handleFillDemoContent() {
    if (hasMeaningfulCourseContent(form)) {
      setConfirmDemoFill(true)
    } else {
      applyDemoContent()
    }
  }

  const ytThumb = youtubeThumbnail(form.introVideoUrl)
  const ytId = extractYouTubeId(form.introVideoUrl)
  const videoUrlInvalid = form.introVideoUrl.trim() !== '' && !isValidYouTubeUrl(form.introVideoUrl)

  if (!isNew && loadingCourse) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner color="border-violet-600" />
      </div>
    )
  }

  return (
    <div dir="rtl" className="max-w-[1200px] space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs mb-2 text-slate-500">
            <Link to={ROUTES.ADMIN_COURSES} className="hover:text-violet-600 transition-colors font-medium">المقررات</Link>
            <ChevronLeft size={12} className="text-slate-300" />
            <span className="text-slate-700 font-medium">{isNew ? 'دورة جديدة' : (form.nameAr || 'تعديل')}</span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">
            {isNew ? 'إنشاء دورة جديدة' : 'تعديل الدورة'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Save indicator */}
          <AnimatePresence>
            {saved && !unsaved && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                تم الحفظ
              </motion.div>
            )}
          </AnimatePresence>
          {unsaved && (
            <span className="text-xs font-semibold text-amber-600">• تغييرات غير محفوظة</span>
          )}

          {/* Status badge */}
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            className={`py-2 px-3 rounded-xl text-xs font-bold outline-none cursor-pointer border border-transparent transition-colors ${STATUS_STYLES[form.status] || STATUS_STYLES.draft}`}
          >
            <option value="draft">مسودة</option>
            <option value="published">منشور</option>
            <option value="archived">أرشيف</option>
          </select>

          {/* Demo content helper — dev/testing only, secondary to Save */}
          <button
            type="button"
            onClick={handleFillDemoContent}
            title="تعبئة النموذج ببيانات تجريبية واقعية لأغراض الاختبار"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border active:scale-[0.98] bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300"
          >
            <WandSparkles size={15} strokeWidth={1.8} />
            إضافة محتوى تجريبي
          </button>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg shadow-violet-600/25 bg-gradient-to-br from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {saving ? <Spinner size="sm" color="border-white" /> : <Save size={15} strokeWidth={1.8} />}
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
                  className={inputCls}
                />
              </Field>
              <Field label="Course Name (English)">
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Complete Tajweed Course"
                  dir="ltr"
                  className={inputCls}
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
                <select value={form.category} onChange={e => set('category', e.target.value)} className={selectCls}>
                  {[['tajweed','التجويد'],['hifz','الحفظ'],['nazra','النظر'],['arabic','العربية'],['quran','القرآن'],['other','أخرى']].map(([v,l]) =>
                    <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="المستوى">
                <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} className={selectCls}>
                  {[['beginner','مبتدئ'],['intermediate','متوسط'],['advanced','متقدم']].map(([v,l]) =>
                    <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="الفئة العمرية">
                <select value={form.ageGroup} onChange={e => set('ageGroup', e.target.value)} className={selectCls}>
                  {[['children','أطفال'],['teens','مراهقون'],['adults','بالغون']].map(([v,l]) =>
                    <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="اللغة">
                <select value={form.language} onChange={e => set('language', e.target.value)} className={selectCls}>
                  {[['ar','العربية'],['en','English'],['both','الاثنان']].map(([v,l]) =>
                    <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="فئة فرعية (اختياري)">
                <input
                  value={form.subCategory}
                  onChange={e => set('subCategory', e.target.value)}
                  placeholder="مثال: أحكام النون الساكنة"
                  className={inputCls}
                />
              </Field>
              <Field label="المعلم">
                <select value={form.instructor} onChange={e => set('instructor', e.target.value)} className={selectCls}>
                  <option value="">اختر معلمًا (اختياري)</option>
                  {teachers.map(t => (
                    <option key={t._id || t.userId} value={t._id || t.userId}>
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
                className={inputCls}
              />
              <div className="text-xs mt-1 text-slate-400">{form.seo.title.length}/200 حرف</div>
            </Field>
            <Field label="وصف SEO">
              <TField
                value={form.seo.description}
                onChange={e => setSeo('description', e.target.value)}
                placeholder="وصف مخصص لمحركات البحث..."
                rows={3}
              />
              <div className="text-xs mt-1 text-slate-400">{form.seo.description.length}/500 حرف</div>
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
            <SideCard title="الصور">
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
            </SideCard>
          )}
          {isNew && (
            <div className="rounded-2xl p-4 bg-violet-50 border border-violet-200">
              <div className="flex items-start gap-3">
                <Info size={16} strokeWidth={1.8} className="flex-none mt-0.5 text-violet-500" />
                <p className="text-xs leading-relaxed text-violet-700">
                  يمكنك رفع الصور بعد إنشاء الدورة. احفظ المعلومات الأساسية أولاً ثم أضف الصور.
                </p>
              </div>
            </div>
          )}

          {/* Intro Video */}
          <SideCard title="الفيديو التعريفي">
            <Field label="رابط YouTube">
              <input
                value={form.introVideoUrl}
                onChange={e => { set('introVideoUrl', e.target.value); setVideoPreview(false) }}
                placeholder="https://youtube.com/watch?v=..."
                dir="ltr"
                className={`${inputCls} text-xs ${videoUrlInvalid ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
              />
              {videoUrlInvalid && (
                <p className="mt-1.5 text-[11px] font-semibold text-red-600">
                  رابط غير صالح — يُسمح فقط بروابط YouTube (watch, youtu.be, embed, shorts)
                </p>
              )}
            </Field>
            {ytThumb && (
              <div className="relative rounded-xl overflow-hidden cursor-pointer border border-slate-200" style={{ height: '120px' }} onClick={() => setVideoPreview(true)}>
                <img src={ytThumb} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.35)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-600/90">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="m5 3 14 9-14 9V3Z"/></svg>
                  </div>
                </div>
              </div>
            )}
          </SideCard>

          {/* Publishing */}
          <SideCard title="الإعدادات">
            <div className="space-y-3">
              <Toggle checked={form.featured} onChange={v => set('featured', v)} label="مقرر مميز" />
              <Toggle checked={form.enrollmentEnabled} onChange={v => set('enrollmentEnabled', v)} label="التسجيل مفتوح" />
              <Toggle checked={form.certificateAvailable} onChange={v => set('certificateAvailable', v)} label="شهادة إتمام متاحة" />
            </div>
            <div className="pt-3 border-t border-slate-200">
              <Field label="ترتيب العرض">
                <input
                  type="number"
                  value={form.order}
                  onChange={e => set('order', e.target.value)}
                  min="0"
                  className={inputCls}
                />
              </Field>
            </div>
          </SideCard>

          {/* Academic Info */}
          <SideCard title="المعلومات الأكاديمية">
            <div className="grid grid-cols-3 gap-2">
              <Field label="المدة (ساعة)">
                <input type="number" min="0" value={form.estimatedDuration} onChange={e => set('estimatedDuration', e.target.value)} className={`${inputCls} px-2 py-2 text-xs`} />
              </Field>
              <Field label="عدد الدروس">
                <input type="number" min="0" value={form.lessonsCount} onChange={e => set('lessonsCount', e.target.value)} className={`${inputCls} px-2 py-2 text-xs`} />
              </Field>
              <Field label="المدة (أسبوع)">
                <input type="number" min="1" value={form.durationWeeks} onChange={e => set('durationWeeks', e.target.value)} className={`${inputCls} px-2 py-2 text-xs`} />
              </Field>
            </div>
          </SideCard>

          {/* Slug info */}
          {!isNew && course?.slug && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-2 bg-slate-50 border border-slate-200">
              <Link2 size={13} strokeWidth={1.8} className="text-slate-400 flex-none" />
              <span className="text-[11px] font-mono break-all text-slate-500">
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
            style={{ background: 'rgba(15,23,42,0.85)' }}
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
                src={youtubeEmbedUrl(form.introVideoUrl, { autoplay: true })}
                className="w-full aspect-video"
                title="معاينة الفيديو التعريفي"
                allow="autoplay; encrypted-media"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo content confirmation — only shown when replacing real content */}
      <ConfirmDialog
        open={confirmDemoFill}
        onClose={() => setConfirmDemoFill(false)}
        onConfirm={applyDemoContent}
        title="استبدال البيانات الحالية؟"
        message="سيتم استبدال محتوى النموذج الحالي ببيانات تجريبية. هل تريد المتابعة؟"
        confirmLabel="متابعة"
        cancelLabel="إلغاء"
        variant="purple"
      />
    </div>
  )
}
