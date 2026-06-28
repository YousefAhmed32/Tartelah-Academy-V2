import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { FileText, CircleCheck, Pencil, Eye, Star, Pin, BookOpen, Inbox } from 'lucide-react'
import api from '../../utils/api.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'
import Modal from '../../components/ui/Modal.jsx'
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function StatusBadge({ status }) {
  const MAP = {
    published: { label: 'منشور', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    draft:     { label: 'مسودة', bg: 'bg-gray-100',    text: 'text-gray-600' },
    scheduled: { label: 'مجدول', bg: 'bg-blue-100',   text: 'text-blue-700' },
    archived:  { label: 'مؤرشف', bg: 'bg-orange-100', text: 'text-orange-700' },
  }
  const s = MAP[status] || MAP.draft
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

// ── Category Modal ─────────────────────────────────────────────────────────────

function CategoryModal({ open, onClose, refetch }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', nameAr: '', color: '#7c3aed', icon: '📚', description: '' })
  const [editId, setEditId] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const { data: cats = [] } = useQuery({
    queryKey: ['articleCategories'],
    queryFn: () => api.get('/articles/categories').then(r => r.data.data || []),
    enabled: open,
  })

  const saveMut = useMutation({
    mutationFn: data => editId
      ? api.put(`/articles/categories/${editId}`, data)
      : api.post('/articles/categories', data),
    onSuccess: () => {
      toast.success(editId ? 'تم تحديث الفئة' : 'تم إنشاء الفئة')
      queryClient.invalidateQueries(['articleCategories'])
      refetch()
      setForm({ name: '', nameAr: '', color: '#7c3aed', icon: '📚', description: '' })
      setEditId(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'خطأ'),
  })

  const delMut = useMutation({
    mutationFn: id => api.delete(`/articles/categories/${id}`),
    onSuccess: () => {
      toast.success('تم حذف الفئة')
      queryClient.invalidateQueries(['articleCategories'])
      setConfirmDel(null)
    },
    onError: err => toast.error(err.response?.data?.message || 'خطأ'),
  })

  function startEdit(cat) {
    setEditId(cat._id)
    setForm({ name: cat.name, nameAr: cat.nameAr || '', color: cat.color || '#7c3aed', icon: cat.icon || '📚', description: cat.description || '' })
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="إدارة الفئات" size="md">
      <div className="space-y-4">
        {/* Form */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-gray-700">{editId ? 'تعديل الفئة' : 'فئة جديدة'}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">الاسم (عربي)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.nameAr} onChange={e => setForm(f => ({...f, nameAr: e.target.value}))} dir="rtl" placeholder="مثال: تجويد" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">الاسم (إنجليزي)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g. Tajweed" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">اللون</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm(f => ({...f, color: e.target.value}))}
                  className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={form.color} onChange={e => setForm(f => ({...f, color: e.target.value}))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">الأيقونة (إيموجي)</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.icon} onChange={e => setForm(f => ({...f, icon: e.target.value}))} placeholder="📚" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            {editId && (
              <button onClick={() => { setEditId(null); setForm({ name: '', nameAr: '', color: '#7c3aed', icon: '📚', description: '' }) }}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                إلغاء
              </button>
            )}
            <button
              onClick={() => saveMut.mutate({ name: form.name || form.nameAr, ...form })}
              disabled={saveMut.isPending || (!form.name && !form.nameAr)}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {saveMut.isPending ? 'جاري الحفظ...' : editId ? 'تحديث' : 'إضافة'}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {cats.map(cat => (
            <div key={cat._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <span className="text-lg">{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-gray-900">{cat.nameAr || cat.name}</span>
                {cat.articlesCount > 0 && <span className="text-xs text-gray-400 mr-2">({cat.articlesCount} مقال)</span>}
              </div>
              <div className="w-4 h-4 rounded-full flex-none" style={{ background: cat.color }} />
              <button onClick={() => startEdit(cat)} className="text-gray-400 hover:text-violet-600 transition-colors p-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={() => setConfirmDel(cat)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          ))}
          {cats.length === 0 && <p className="text-center text-sm text-gray-400 py-4">لا توجد فئات بعد</p>}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => delMut.mutate(confirmDel?._id)}
        title="حذف الفئة"
        message={`هل تريد حذف فئة "${confirmDel?.nameAr || confirmDel?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف"
        isDangerous
      />
    </Modal>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminArticlesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [catModal, setCatModal] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [showDeleted, setShowDeleted] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminArticles', { tab: activeTab, search, page, deleted: showDeleted }],
    queryFn: () => api.get('/articles/admin/all', {
      params: {
        status: activeTab === 'all' ? undefined : activeTab,
        search: search || undefined,
        page,
        limit: 15,
        deleted: showDeleted,
      }
    }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const articles = data?.data?.articles || []
  const stats = data?.data?.stats || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  // Build stat cards from API stats
  const statMap = {}
  stats.forEach(s => { statMap[s._id] = { count: s.count, views: s.totalViews } })
  const totalPublished = statMap.published?.count || 0
  const totalDraft = statMap.draft?.count || 0
  const totalViews = Object.values(statMap).reduce((acc, s) => acc + (s.views || 0), 0)

  const TABS = [
    { value: 'all',       label: 'الكل' },
    { value: 'published', label: 'منشورة' },
    { value: 'draft',     label: 'مسودات' },
    { value: 'scheduled', label: 'مجدولة' },
    { value: 'archived',  label: 'مؤرشفة' },
  ]

  const publishMut = useMutation({
    mutationFn: id => api.post(`/articles/admin/${id}/publish`),
    onSuccess: () => { toast.success('تم النشر'); queryClient.invalidateQueries(['adminArticles']) },
    onError: err => toast.error(err.response?.data?.message || 'خطأ'),
  })

  const unpublishMut = useMutation({
    mutationFn: id => api.post(`/articles/admin/${id}/unpublish`),
    onSuccess: () => { toast.success('تم إلغاء النشر'); queryClient.invalidateQueries(['adminArticles']) },
    onError: err => toast.error(err.response?.data?.message || 'خطأ'),
  })

  const featureMut = useMutation({
    mutationFn: id => api.post(`/articles/admin/${id}/feature`),
    onSuccess: () => { toast.success('تم تحديث التمييز'); queryClient.invalidateQueries(['adminArticles']) },
    onError: err => toast.error(err.response?.data?.message || 'خطأ'),
  })

  const pinMut = useMutation({
    mutationFn: id => api.post(`/articles/admin/${id}/pin`),
    onSuccess: () => { toast.success('تم تحديث التثبيت'); queryClient.invalidateQueries(['adminArticles']) },
    onError: err => toast.error(err.response?.data?.message || 'خطأ'),
  })

  const duplicateMut = useMutation({
    mutationFn: id => api.post(`/articles/admin/${id}/duplicate`),
    onSuccess: (res) => {
      toast.success('تم نسخ المقال')
      queryClient.invalidateQueries(['adminArticles'])
      navigate(`/admin/articles/${res.data.data._id}/edit`)
    },
    onError: err => toast.error(err.response?.data?.message || 'خطأ'),
  })

  const deleteMut = useMutation({
    mutationFn: id => api.delete(`/articles/admin/${id}`),
    onSuccess: () => { toast.success('تم حذف المقال'); queryClient.invalidateQueries(['adminArticles']); setConfirmDel(null) },
    onError: err => toast.error(err.response?.data?.message || 'خطأ'),
  })

  const restoreMut = useMutation({
    mutationFn: id => api.post(`/articles/admin/${id}/restore`),
    onSuccess: () => { toast.success('تم استعادة المقال'); queryClient.invalidateQueries(['adminArticles']) },
    onError: err => toast.error(err.response?.data?.message || 'خطأ'),
  })

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">إدارة المقالات</h1>
          <p className="text-sm text-gray-500 mt-0.5">إنشاء المقالات وإدارتها ونشرها</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCatModal(true)}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            الفئات
          </button>
          <button onClick={() => navigate(ROUTES.ADMIN_ARTICLE_NEW)}
            className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors flex items-center gap-2 shadow-md shadow-violet-200">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
            مقال جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'إجمالي المقالات', value: total,                    Icon: FileText,    color: '#7c3aed' },
          { label: 'منشورة',           value: totalPublished,           Icon: CircleCheck, color: '#22c55e' },
          { label: 'مسودات',           value: totalDraft,               Icon: Pencil,      color: '#f59e0b' },
          { label: 'إجمالي المشاهدات', value: totalViews.toLocaleString(), Icon: Eye,      color: '#3b82f6' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="mb-1"><s.Icon size={22} strokeWidth={1.8} color={s.color} /></div>
            <div className="font-heading font-extrabold text-2xl" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {TABS.map(t => (
              <button key={t.value}
                onClick={() => { setActiveTab(t.value); setPage(1); setShowDeleted(false) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === t.value && !showDeleted ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}>
                {t.label}
              </button>
            ))}
            <button
              onClick={() => { setShowDeleted(true); setActiveTab('all'); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                showDeleted ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:text-gray-900'
              }`}>
              محذوفة
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute right-3 top-2.5 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="بحث في المقالات..."
              className="w-full pl-3 pr-8 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              dir="rtl"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-3"><Inbox size={48} strokeWidth={1.2} color="#d1d5db" /></div>
            <p className="text-gray-500 font-medium">
              {showDeleted ? 'لا توجد مقالات محذوفة' : 'لا توجد مقالات'}
            </p>
            {!showDeleted && (
              <button onClick={() => navigate(ROUTES.ADMIN_ARTICLE_NEW)}
                className="mt-4 px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors">
                أنشئ مقالاً الآن
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">المقال</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">الفئة</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">الحالة</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">الإحصائيات</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">التاريخ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {articles.map(article => (
                  <tr key={article._id} className="hover:bg-gray-50 transition-colors group">
                    {/* Article info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-none bg-gray-100">
                          {article.coverImage
                            ? <img src={getFileUrl(article.coverImage)} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><BookOpen size={20} strokeWidth={1.6} color="#d1d5db" /></div>}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 truncate max-w-xs" dir="rtl">
                            {article.titleAr || article.title}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                            {article.featured && <Star size={11} strokeWidth={0} fill="#f59e0b" />}
                            {article.pinned && <Pin size={11} strokeWidth={0} fill="#3b82f6" />}
                            {article.readingTime} دقيقة قراءة
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      {article.category ? (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: `${article.category.color}18`, color: article.category.color }}>
                          {article.category.icon} {article.category.nameAr || article.category.name}
                        </span>
                      ) : <span className="text-xs text-gray-400">بدون فئة</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusBadge status={article.status} />
                    </td>

                    {/* Stats */}
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-3 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                          {article.views?.toLocaleString() || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2"/></svg>
                          {article.likes || 0}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-xs text-gray-500" dir="rtl">
                        {article.status === 'published' ? formatDate(article.publishedAt) : formatDate(article.createdAt)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        {!showDeleted ? (
                          <>
                            <button
                              onClick={() => navigate(`/admin/articles/${article._id}/edit`)}
                              title="تعديل"
                              className="w-8 h-8 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            {article.status !== 'published'
                              ? <button onClick={() => publishMut.mutate(article._id)} title="نشر"
                                  className="w-8 h-8 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors flex items-center justify-center">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </button>
                              : <button onClick={() => unpublishMut.mutate(article._id)} title="إلغاء النشر"
                                  className="w-8 h-8 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-orange-600 transition-colors flex items-center justify-center">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                            }
                            <button onClick={() => featureMut.mutate(article._id)} title={article.featured ? 'إلغاء التمييز' : 'تمييز'}
                              className={`w-8 h-8 rounded-lg transition-colors flex items-center justify-center ${article.featured ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}>
                              <Star size={14} strokeWidth={article.featured ? 0 : 1.8} fill={article.featured ? '#f59e0b' : 'none'} />
                            </button>
                            <button onClick={() => duplicateMut.mutate(article._id)} title="نسخ"
                              className="w-8 h-8 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                            </button>
                            {article.status === 'published' && (
                              <a href={`/articles/${article.slug}`} target="_blank" rel="noopener noreferrer" title="معاينة"
                                className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                              </a>
                            )}
                            <button onClick={() => setConfirmDel(article)} title="حذف"
                              className="w-8 h-8 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </>
                        ) : (
                          <button onClick={() => restoreMut.mutate(article._id)} title="استعادة"
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors">
                            استعادة
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 p-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">{total} مقال</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-9 h-9 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all">
                ‹
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = i + Math.max(1, page - 2)
                if (p > totalPages) return null
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${p === page ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-9 h-9 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all">
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Category Modal */}
      <CategoryModal open={catModal} onClose={() => setCatModal(false)} refetch={refetch} />

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => deleteMut.mutate(confirmDel?._id)}
        title="حذف المقال"
        message={`هل تريد حذف مقال "${confirmDel?.titleAr || confirmDel?.title}"؟ يمكن استعادته لاحقاً من تبويب "محذوفة".`}
        confirmText="حذف"
        isDangerous
      />
    </div>
  )
}
