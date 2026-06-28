import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Quote, Link2, Image, Lightbulb, AlertTriangle, Pencil, Eye,
  FileText, SearchIcon, ImageIcon as ImageTab, CircleCheck, Rocket, Star, Pin, ExternalLink,
} from 'lucide-react'
import api from '../../utils/api.js'
import { getFileUrl } from '../../config/constants.js'

// ── Rich Text Editor ───────────────────────────────────────────────────────────

const TOOLBAR_ACTIONS = [
  { id: 'bold',    label: 'B',    title: 'عريض',    insert: (sel) => `<strong>${sel || 'نص عريض'}</strong>` },
  { id: 'italic',  label: 'I',    title: 'مائل',    insert: (sel) => `<em>${sel || 'نص مائل'}</em>` },
  { id: 'under',   label: 'U',    title: 'خط تحت',  insert: (sel) => `<u>${sel || 'نص'}</u>` },
  { sep: true },
  { id: 'h2',      label: 'H2',   title: 'عنوان 2', insert: (sel) => `\n<h2>${sel || 'عنوان رئيسي'}</h2>\n` },
  { id: 'h3',      label: 'H3',   title: 'عنوان 3', insert: (sel) => `\n<h3>${sel || 'عنوان فرعي'}</h3>\n` },
  { sep: true },
  { id: 'ul',      label: '• قائمة', title: 'قائمة نقطية',
    insert: (sel) => `\n<ul>\n  <li>${sel || 'عنصر 1'}</li>\n  <li>عنصر 2</li>\n</ul>\n` },
  { id: 'ol',      label: '1. قائمة', title: 'قائمة مرقمة',
    insert: (sel) => `\n<ol>\n  <li>${sel || 'عنصر 1'}</li>\n  <li>عنصر 2</li>\n</ol>\n` },
  { sep: true },
  { id: 'quote',   LabelIcon: Quote,         title: 'اقتباس',
    insert: (sel) => `\n<blockquote>${sel || 'نص الاقتباس هنا'}</blockquote>\n` },
  { id: 'code',    label: '</>',  title: 'كود',     insert: (sel) => `<code>${sel || 'الكود هنا'}</code>` },
  { id: 'pre',     label: '⬜ كود', title: 'كتلة كود',
    insert: (sel) => `\n<pre><code>${sel || '// الكود هنا'}</code></pre>\n` },
  { sep: true },
  { id: 'link',    LabelIcon: Link2,         title: 'رابط',
    insert: (sel) => `<a href="https://">${sel || 'نص الرابط'}</a>` },
  { id: 'img',     LabelIcon: Image,         title: 'صورة',
    insert: (sel) => `\n<img src="${sel || 'رابط الصورة'}" alt="وصف الصورة" />\n` },
  { sep: true },
  { id: 'hr',      label: '—',    title: 'فاصل', insert: () => `\n<hr />\n` },
  { id: 'callout', LabelIcon: Lightbulb,    title: 'تنبيه',
    insert: (sel) => `\n<div class="callout"><strong>ملاحظة:</strong> ${sel || 'نص التنبيه هنا'}</div>\n` },
  { id: 'callout-w', LabelIcon: AlertTriangle, title: 'تحذير',
    insert: (sel) => `\n<div class="callout callout-warning"><strong>تحذير:</strong> ${sel || 'نص التحذير هنا'}</div>\n` },
  { sep: true },
  { id: 'table',   label: '⊞ جدول', title: 'جدول',
    insert: () => `\n<table>\n  <thead><tr><th>العنوان 1</th><th>العنوان 2</th></tr></thead>\n  <tbody>\n    <tr><td>خلية 1</td><td>خلية 2</td></tr>\n    <tr><td>خلية 3</td><td>خلية 4</td></tr>\n  </tbody>\n</table>\n` },
]

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.substring(start, end)
  const insertion = typeof text === 'function' ? text(selected) : text
  const newValue = textarea.value.substring(0, start) + insertion + textarea.value.substring(end)
  const newPos = start + insertion.length
  return { newValue, newPos }
}

function RichEditor({ value, onChange, placeholder = 'اكتب محتوى المقال هنا...' }) {
  const [tab, setTab] = useState('write')
  const textareaRef = useRef(null)

  function handleToolbar(action) {
    const ta = textareaRef.current
    if (!ta) return
    const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd)
    const { newValue, newPos } = insertAtCursor(ta, action.insert(selected))
    onChange(newValue)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(newPos, newPos)
    }, 10)
  }

  const wordCount = value.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-200 bg-gray-50 px-3">
        {['write', 'preview'].map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${
              tab === t ? 'border-violet-600 text-violet-700' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}>
            {t === 'write' ? <span className="flex items-center gap-1.5"><Pencil size={13} strokeWidth={2} /> كتابة</span> : <span className="flex items-center gap-1.5"><Eye size={13} strokeWidth={2} /> معاينة</span>}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[11px] text-gray-400 ml-3">
          {wordCount} كلمة · {readingTime} دقيقة قراءة
        </span>
      </div>

      {tab === 'write' ? (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-gray-100 bg-gray-50">
            {TOOLBAR_ACTIONS.map((action, i) =>
              action.sep ? (
                <div key={i} className="w-px h-5 bg-gray-300 mx-1" />
              ) : (
                <button key={action.id}
                  onClick={() => handleToolbar(action)}
                  title={action.title}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  style={{ fontFamily: action.label && action.label.match?.(/[a-zA-Z]/) ? 'monospace' : 'inherit' }}>
                  {action.LabelIcon ? <action.LabelIcon size={14} strokeWidth={2} /> : action.label}
                </button>
              )
            )}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            dir="rtl"
            className="w-full px-4 py-4 text-sm text-gray-700 font-mono leading-relaxed resize-none focus:outline-none"
            style={{ minHeight: '400px', fontFamily: 'Consolas, monospace' }}
          />
        </>
      ) : (
        <div
          className="prose-article p-6 min-h-[400px]"
          dir="rtl"
          dangerouslySetInnerHTML={{ __html: value || '<p class="text-gray-400">لا يوجد محتوى للمعاينة بعد</p>' }}
        />
      )}

      <style>{`
        .prose-article { font-family: 'Tajawal', sans-serif; color: #374151; line-height: 1.9; font-size: 16px; }
        .prose-article h2 { font-family: 'Cairo', sans-serif; font-size: 1.5rem; font-weight: 800; color: #111827; margin: 2rem 0 0.8rem; border-bottom: 2px solid #f3f4f6; padding-bottom: 0.4rem; }
        .prose-article h3 { font-family: 'Cairo', sans-serif; font-size: 1.2rem; font-weight: 700; color: #1f2937; margin: 1.5rem 0 0.6rem; }
        .prose-article p { margin-bottom: 1.2rem; }
        .prose-article a { color: #7c3aed; text-decoration: underline; }
        .prose-article ul, .prose-article ol { padding-right: 1.5rem; margin-bottom: 1.2rem; }
        .prose-article li { margin-bottom: 0.4rem; }
        .prose-article blockquote { border-right: 4px solid #7c3aed; background: #faf5ff; padding: 1rem 1.5rem; margin: 1.5rem 0; border-radius: 0 12px 12px 0; color: #5b21b6; }
        .prose-article code { background: #f3f4f6; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85em; color: #7c3aed; }
        .prose-article pre { background: #1e1b4b; padding: 1.5rem; border-radius: 12px; overflow-x: auto; margin: 1.5rem 0; }
        .prose-article pre code { background: none; color: #c4b5fd; }
        .prose-article img { border-radius: 12px; max-width: 100%; margin: 1rem 0; }
        .prose-article table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
        .prose-article th, .prose-article td { padding: 0.75rem 1rem; border: 1px solid #e5e7eb; text-align: right; }
        .prose-article th { background: #f9fafb; font-weight: 700; }
        .prose-article hr { border: none; border-top: 2px solid #f3f4f6; margin: 2rem 0; }
        .prose-article .callout { background: #f0fdf4; border-right: 4px solid #22c55e; padding: 1rem 1.5rem; border-radius: 0 12px 12px 0; margin: 1.5rem 0; }
        .prose-article .callout-warning { background: #fffbeb; border-right-color: #f59e0b; }
        .prose-article .callout-info { background: #eff6ff; border-right-color: #3b82f6; }
      `}</style>
    </div>
  )
}

// ── Cover Upload ───────────────────────────────────────────────────────────────

function CoverUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('cover', file)
      const res = await api.post('/articles/upload-cover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      onChange(res.data.data?.url)
      toast.success('تم رفع الصورة')
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل رفع الصورة')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {value ? (
        <div className="relative rounded-xl overflow-hidden group">
          <img src={getFileUrl(value)} alt="غلاف المقال" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button onClick={() => inputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-white text-sm font-bold text-gray-900 hover:bg-gray-100 transition-colors">
              تغيير الصورة
            </button>
            <button onClick={() => onChange('')}
              className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
              حذف
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all"
        >
          {uploading ? (
            <div className="text-sm text-violet-600 font-semibold">جاري الرفع...</div>
          ) : (
            <>
              <Image size={36} strokeWidth={1.4} color="#9ca3af" className="mb-2 mx-auto" />
              <div className="text-sm font-semibold text-gray-600 mb-1">اضغط لرفع صورة الغلاف</div>
              <div className="text-xs text-gray-400">JPG, PNG, WebP — حتى 8MB</div>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  )
}

// ── Tags Input ─────────────────────────────────────────────────────────────────

function TagsInput({ value = [], onChange }) {
  const [input, setInput] = useState('')

  function addTag(tag) {
    const clean = tag.trim().toLowerCase()
    if (clean && !value.includes(clean) && value.length < 10) {
      onChange([...value, clean])
    }
    setInput('')
  }

  function removeTag(tag) {
    onChange(value.filter(t => t !== tag))
  }

  return (
    <div className="border border-gray-200 rounded-xl p-2.5 focus-within:ring-2 focus-within:ring-violet-500 transition-all">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map(tag => (
          <span key={tag} className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">
            #{tag}
            <button onClick={() => removeTag(tag)} className="text-violet-400 hover:text-violet-700 transition-colors">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
            e.preventDefault()
            addTag(input)
          }
          if (e.key === 'Backspace' && !input && value.length > 0) {
            onChange(value.slice(0, -1))
          }
        }}
        placeholder={value.length < 10 ? 'أضف وسماً ثم اضغط Enter...' : 'الحد الأقصى 10 وسوم'}
        disabled={value.length >= 10}
        className="w-full text-sm text-gray-700 focus:outline-none bg-transparent placeholder-gray-400"
        dir="rtl"
      />
    </div>
  )
}

// ── Main Editor Page ───────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  titleAr: '',
  title: '',
  slug: '',
  excerptAr: '',
  excerpt: '',
  contentAr: '',
  content: '',
  coverImage: '',
  category: '',
  tags: [],
  status: 'draft',
  featured: false,
  pinned: false,
  seo: {
    title: '', description: '', keywords: [],
    canonicalUrl: '', ogImage: '', twitterCard: 'summary_large_image', metaRobots: 'index, follow',
  },
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '').replace(/--+/g, '-').slice(0, 100)
}

export default function AdminArticleEditorPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState(DEFAULT_FORM)
  const [activePanel, setActivePanel] = useState('content')
  const [autoSaveStatus, setAutoSaveStatus] = useState('')
  const autoSaveTimer = useRef(null)
  const slugManuallySet = useRef(false)

  // Load categories
  const { data: categories = [] } = useQuery({
    queryKey: ['articleCategories'],
    queryFn: () => api.get('/articles/categories').then(r => r.data.data || []),
  })

  // Load article for edit
  const { data: existingArticle } = useQuery({
    queryKey: ['adminArticle', id],
    queryFn: () => api.get(`/articles/admin/${id}`).then(r => r.data.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existingArticle) {
      setForm({
        titleAr: existingArticle.titleAr || '',
        title: existingArticle.title || '',
        slug: existingArticle.slug || '',
        excerptAr: existingArticle.excerptAr || '',
        excerpt: existingArticle.excerpt || '',
        contentAr: existingArticle.contentAr || '',
        content: existingArticle.content || '',
        coverImage: existingArticle.coverImage || '',
        category: existingArticle.category?._id || '',
        tags: existingArticle.tags || [],
        status: existingArticle.status || 'draft',
        featured: existingArticle.featured || false,
        pinned: existingArticle.pinned || false,
        seo: existingArticle.seo || DEFAULT_FORM.seo,
      })
      slugManuallySet.current = true
    }
  }, [existingArticle])

  // Auto-generate slug from title
  function handleTitleChange(val) {
    setForm(f => ({
      ...f,
      titleAr: val,
      slug: slugManuallySet.current ? f.slug : slugify(val),
    }))
  }

  // Save mutation
  const saveMut = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) {
        return api.put(`/articles/admin/${id}/edit`, payload)
      } else {
        return api.post('/articles', payload)
      }
    },
    onSuccess: (res) => {
      toast.success(isEdit ? 'تم حفظ المقال' : 'تم إنشاء المقال')
      queryClient.invalidateQueries(['adminArticles'])
      if (!isEdit) {
        navigate(`/admin/articles/${res.data.data._id}/edit`, { replace: true })
      } else {
        queryClient.invalidateQueries(['adminArticle', id])
      }
    },
    onError: err => toast.error(err.response?.data?.message || 'حدث خطأ أثناء الحفظ'),
  })

  // Publish mutation
  const publishMut = useMutation({
    mutationFn: async () => {
      const payload = { ...form, status: 'published' }
      if (isEdit) {
        await api.put(`/articles/admin/${id}/edit`, payload)
        return api.post(`/articles/admin/${id}/publish`)
      } else {
        return api.post('/articles', { ...payload, status: 'published' })
      }
    },
    onSuccess: (res) => {
      toast.success('تم نشر المقال بنجاح!')
      queryClient.invalidateQueries(['adminArticles'])
      if (!isEdit) navigate(`/admin/articles/${res.data.data._id}/edit`, { replace: true })
      else queryClient.invalidateQueries(['adminArticle', id])
    },
    onError: err => toast.error(err.response?.data?.message || 'فشل النشر'),
  })

  // Auto-save draft every 60s
  useEffect(() => {
    if (!form.titleAr && !form.contentAr) return
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      if (isEdit) {
        setAutoSaveStatus('جاري الحفظ التلقائي...')
        saveMut.mutateAsync(form).then(() => {
          setAutoSaveStatus('تم الحفظ تلقائياً')
          setTimeout(() => setAutoSaveStatus(''), 3000)
        }).catch(() => setAutoSaveStatus(''))
      }
    }, 60000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [form, isEdit])

  const isPending = saveMut.isPending || publishMut.isPending
  const currentContent = form.contentAr || form.content

  const PANELS = [
    { id: 'content', label: 'المحتوى',  Icon: FileText },
    { id: 'seo',     label: 'SEO',      Icon: SearchIcon },
    { id: 'media',   label: 'الوسائط',  Icon: ImageTab },
  ]

  return (
    <div dir="rtl" className="max-w-6xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/articles')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div>
            <h1 className="font-heading font-bold text-xl text-gray-900">
              {isEdit ? 'تعديل المقال' : 'مقال جديد'}
            </h1>
            {autoSaveStatus && <p className="text-xs text-gray-400 mt-0.5">{autoSaveStatus}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {form.status === 'published' && existingArticle?.slug && (
            <a href={`/articles/${existingArticle.slug}`} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
              معاينة
            </a>
          )}
          <button
            onClick={() => saveMut.mutate(form)}
            disabled={isPending || !form.titleAr}
            className="px-5 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {saveMut.isPending ? 'جاري الحفظ...' : 'حفظ كمسودة'}
          </button>
          <button
            onClick={() => publishMut.mutate()}
            disabled={isPending || !form.titleAr || !currentContent}
            className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-md shadow-violet-200 flex items-center gap-2">
            {publishMut.isPending ? 'جاري النشر...' : (form.status === 'published' ? <span className="flex items-center gap-1.5"><CircleCheck size={15} strokeWidth={2} /> تحديث ونشر</span> : <span className="flex items-center gap-1.5"><Rocket size={15} strokeWidth={2} /> نشر المقال</span>)}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Editor Column ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Title */}
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">العنوان (عربي) *</label>
                <input
                  value={form.titleAr}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="عنوان مقالك بالعربية..."
                  dir="rtl"
                  className="w-full text-2xl font-heading font-bold text-gray-900 placeholder-gray-300 focus:outline-none border-b border-gray-100 pb-2"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">العنوان (إنجليزي)</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  placeholder="Article title in English..."
                  className="w-full text-base font-semibold text-gray-700 placeholder-gray-300 focus:outline-none border-b border-gray-100 pb-2"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">الرابط (Slug)</label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-xs text-gray-400">/articles/</span>
                  <input
                    value={form.slug}
                    onChange={e => { slugManuallySet.current = true; setForm(f => ({...f, slug: slugify(e.target.value)})) }}
                    placeholder="article-url-slug"
                    className="flex-1 text-sm text-violet-700 font-mono bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Excerpt */}
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">الوصف المختصر</label>
            <textarea
              value={form.excerptAr}
              onChange={e => setForm(f => ({...f, excerptAr: e.target.value}))}
              placeholder="وصف مختصر يظهر في قوائم المقالات ونتائج البحث (حتى 600 حرف)..."
              dir="rtl"
              maxLength={600}
              rows={3}
              className="w-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
            />
            <div className="text-[11px] text-gray-400 text-left mt-1">{form.excerptAr.length}/600</div>
          </div>

          {/* Panel Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {PANELS.map(p => (
              <button key={p.id}
                onClick={() => setActivePanel(p.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activePanel === p.id ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}>
                <p.Icon size={13} strokeWidth={2} />{p.label}
              </button>
            ))}
          </div>

          {/* Content Panel */}
          {activePanel === 'content' && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="px-5 pt-4 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">المحتوى (عربي)</span>
                  <span className="text-[10px] text-gray-400">— يدعم HTML</span>
                </div>
              </div>
              <div className="p-4">
                <RichEditor
                  value={form.contentAr}
                  onChange={val => setForm(f => ({...f, contentAr: val}))}
                  placeholder="اكتب محتوى مقالك بالعربية هنا... يمكنك استخدام HTML أو أزرار شريط الأدوات"
                />
              </div>

              <div className="px-4 pb-4">
                <div className="px-5 py-3 mb-3 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">المحتوى (إنجليزي) — اختياري</span>
                </div>
                <RichEditor
                  value={form.content}
                  onChange={val => setForm(f => ({...f, content: val}))}
                  placeholder="Write article content in English (optional)..."
                />
              </div>
            </div>
          )}

          {/* SEO Panel */}
          {activePanel === 'seo' && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <h3 className="font-heading font-bold text-base text-gray-900">إعدادات SEO</h3>
              {[
                { label: 'عنوان SEO', key: 'title', placeholder: 'العنوان الذي يظهر في نتائج البحث (50-60 حرف)', max: 70 },
                { label: 'وصف SEO', key: 'description', placeholder: 'الوصف في نتائج البحث (120-160 حرف)', max: 200, multi: true },
                { label: 'Canonical URL', key: 'canonicalUrl', placeholder: 'https://tartelah.com/articles/...' },
                { label: 'صورة Open Graph', key: 'ogImage', placeholder: 'رابط صورة المشاركة على وسائل التواصل' },
              ].map(({ label, key, placeholder, max, multi }) => (
                <div key={key}>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">{label}</label>
                  {multi ? (
                    <textarea
                      value={form.seo[key] || ''}
                      onChange={e => setForm(f => ({...f, seo: {...f.seo, [key]: e.target.value}}))}
                      placeholder={placeholder}
                      maxLength={max}
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    />
                  ) : (
                    <input
                      value={form.seo[key] || ''}
                      onChange={e => setForm(f => ({...f, seo: {...f.seo, [key]: e.target.value}}))}
                      placeholder={placeholder}
                      maxLength={max}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  )}
                  {max && <div className="text-[11px] text-gray-400 text-left mt-1">{(form.seo[key] || '').length}/{max}</div>}
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Twitter Card</label>
                  <select
                    value={form.seo.twitterCard}
                    onChange={e => setForm(f => ({...f, seo: {...f.seo, twitterCard: e.target.value}}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="summary_large_image">Summary Large Image</option>
                    <option value="summary">Summary</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Meta Robots</label>
                  <select
                    value={form.seo.metaRobots}
                    onChange={e => setForm(f => ({...f, seo: {...f.seo, metaRobots: e.target.value}}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="index, follow">index, follow</option>
                    <option value="noindex, follow">noindex, follow</option>
                    <option value="index, nofollow">index, nofollow</option>
                    <option value="noindex, nofollow">noindex, nofollow</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">الكلمات المفتاحية</label>
                <input
                  value={(form.seo.keywords || []).join(', ')}
                  onChange={e => setForm(f => ({
                    ...f,
                    seo: {...f.seo, keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)}
                  }))}
                  placeholder="تجويد، حفظ، تلاوة (مفصولة بفواصل)"
                  dir="rtl"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* SEO Preview */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">معاينة نتيجة البحث</div>
                <div className="text-blue-600 text-sm font-semibold truncate">
                  {form.seo.title || form.titleAr || 'عنوان المقال'}
                </div>
                <div className="text-green-700 text-xs mb-1">tartelah.com › articles › {form.slug || 'slug'}</div>
                <div className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                  {form.seo.description || form.excerptAr || 'وصف مختصر للمقال يظهر في نتائج محركات البحث...'}
                </div>
              </div>
            </div>
          )}

          {/* Media Panel */}
          {activePanel === 'media' && (
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <h3 className="font-heading font-bold text-base text-gray-900">الوسائط</h3>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">صورة الغلاف *</label>
                <CoverUpload value={form.coverImage} onChange={val => setForm(f => ({...f, coverImage: val}))} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">رابط صورة الغلاف (بديل)</label>
                <input
                  value={form.coverImage || ''}
                  onChange={e => setForm(f => ({...f, coverImage: e.target.value}))}
                  placeholder="https://... أو /uploads/articles/..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Publish Settings */}
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <h3 className="font-heading font-bold text-sm text-gray-900 mb-4">إعدادات النشر</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">الحالة</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({...f, status: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="draft">مسودة</option>
                  <option value="published">منشور</option>
                  <option value="scheduled">مجدول</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Star size={14} strokeWidth={0} fill="#f59e0b" /> مقال مميز</label>
                <button
                  onClick={() => setForm(f => ({...f, featured: !f.featured}))}
                  className={`w-10 h-5 rounded-full transition-all ${form.featured ? 'bg-amber-400' : 'bg-gray-200'} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.featured ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Pin size={14} strokeWidth={0} fill="#3b82f6" /> تثبيت المقال</label>
                <button
                  onClick={() => setForm(f => ({...f, pinned: !f.pinned}))}
                  className={`w-10 h-5 rounded-full transition-all ${form.pinned ? 'bg-blue-500' : 'bg-gray-200'} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.pinned ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">الفئة</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({...f, category: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">بدون فئة</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.icon} {cat.nameAr || cat.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">الوسوم</label>
            <TagsInput value={form.tags} onChange={tags => setForm(f => ({...f, tags}))} />
            <p className="text-[11px] text-gray-400 mt-1.5">اضغط Enter أو الفاصلة لإضافة وسم</p>
          </div>

          {/* Cover Image Preview (sidebar) */}
          {form.coverImage && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="px-4 pt-3 pb-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">صورة الغلاف</span>
              </div>
              <img src={getFileUrl(form.coverImage)} alt="" className="w-full h-36 object-cover" />
            </div>
          )}

          {/* Quick Status */}
          <div className="bg-gray-50 rounded-2xl p-4 text-center" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="text-xs text-gray-500 mb-2 font-semibold">الحالة الحالية</div>
            <div className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full ${
              form.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
              form.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
              form.status === 'archived' ? 'bg-orange-100 text-orange-700' :
              'bg-gray-200 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                form.status === 'published' ? 'bg-emerald-500 animate-pulse' :
                form.status === 'scheduled' ? 'bg-blue-500' :
                'bg-gray-400'
              }`} />
              {form.status === 'published' ? 'منشور' :
               form.status === 'scheduled' ? 'مجدول' :
               form.status === 'archived' ? 'مؤرشف' : 'مسودة'}
            </div>
            {isEdit && existingArticle?.slug && form.status === 'published' && (
              <a href={`/articles/${existingArticle.slug}`} target="_blank" rel="noopener noreferrer"
                className="block mt-3 text-xs text-violet-600 hover:text-violet-800 transition-colors font-semibold">
                <ExternalLink size={13} strokeWidth={2} className="inline-block ml-1" /> عرض المقال المنشور
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
