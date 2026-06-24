import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatCurrency } from '../../utils/format.js'

const initialForm = {
  nameAr: '', name: '', descriptionAr: '', price: '', durationDays: 30,
  sessionsPerMonth: 8, featuresAr: ''
}

// ── Package Action Menu ───────────────────────────────────────────────────────

function ActionMenu({ pkg, onEdit, onToggle, onDuplicate, onClose }) {
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
      className="absolute left-0 top-10 z-30 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
      style={{ direction: 'rtl' }}
    >
      <button
        onClick={() => { onEdit(pkg); onClose() }}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        تعديل الباقة
      </button>
      <button
        onClick={() => { onToggle(pkg); onClose() }}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
        style={{ color: pkg.isActive ? '#ef4444' : '#10b981' }}
      >
        {pkg.isActive
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="m10 8 6 4-6 4V8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
        }
        {pkg.isActive ? 'إيقاف الباقة' : 'تفعيل الباقة'}
      </button>
      <button
        onClick={() => { onDuplicate(pkg); onClose() }}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-50"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
        تكرار الباقة
      </button>
    </motion.div>
  )
}

// ── Package Card ──────────────────────────────────────────────────────────────

function PackageCard({ pkg, onEdit, onToggle, onDuplicate }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`relative bg-white rounded-2xl border transition-all ${
        pkg.isPopular
          ? 'border-violet-200 shadow-md ring-1 ring-violet-100'
          : 'border-gray-100 shadow-sm'
      }`}
    >
      {/* Popular badge */}
      {pkg.isPopular && (
        <div className="absolute -top-3 right-1/2 translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ background: '#7c3aed' }}>
          الأكثر شيوعاً
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                pkg.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pkg.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {pkg.isActive ? 'نشط' : 'موقوف'}
              </span>
            </div>
            <h3 className="font-heading font-extrabold text-gray-900 text-lg">{pkg.nameAr}</h3>
            {pkg.name && <div className="text-xs text-gray-400 mt-0.5">{pkg.name}</div>}
          </div>

          {/* Actions menu */}
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
                <ActionMenu
                  pkg={pkg}
                  onEdit={onEdit}
                  onToggle={onToggle}
                  onDuplicate={onDuplicate}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="font-heading font-extrabold text-3xl text-violet-700">
              {formatCurrency(pkg.price)}
            </span>
            <span className="text-sm text-gray-400 font-medium">ريال</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {pkg.durationDays} يوم • {pkg.sessionsPerMonth} حصة/شهر
          </div>
        </div>

        {/* Description */}
        {pkg.descriptionAr && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{pkg.descriptionAr}</p>
        )}

        {/* Features */}
        {pkg.featuresAr?.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {pkg.featuresAr.slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="flex-none mt-0.5 text-emerald-500">
                  <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                {f}
              </li>
            ))}
            {pkg.featuresAr.length > 4 && (
              <li className="text-xs text-gray-400 mr-5">+{pkg.featuresAr.length - 4} مزايا أخرى</li>
            )}
          </ul>
        )}

        {/* Management Actions Row */}
        <div className="flex gap-2 pt-3 border-t border-gray-50">
          <button
            onClick={() => onEdit(pkg)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
          >
            تعديل
          </button>
          <button
            onClick={() => onToggle(pkg)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
              pkg.isActive
                ? 'text-gray-500 bg-gray-50 hover:bg-gray-100'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            {pkg.isActive ? 'إيقاف' : 'تفعيل'}
          </button>
          <button
            onClick={() => onDuplicate(pkg)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            تكرار
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Package Form ──────────────────────────────────────────────────────────────

function PackageFormModal({ open, onClose, onSubmit, loading, initialValues, title }) {
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
            {title === 'إضافة باقة جديدة' ? 'إنشاء الباقة' : 'حفظ التغييرات'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">الاسم بالعربية</label>
            <input name="nameAr" value={form.nameAr} onChange={change} className="field-light w-full" placeholder="مثال: الباقة الأساسية" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">الاسم بالإنجليزية</label>
            <input name="name" value={form.name} onChange={change} className="field-light w-full" placeholder="Basic Plan" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">الوصف</label>
          <input name="descriptionAr" value={form.descriptionAr} onChange={change} className="field-light w-full" placeholder="وصف مختصر للباقة..." />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">السعر (ريال)</label>
            <input type="number" name="price" value={form.price} onChange={change} className="field-light w-full" min="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">المدة (يوم)</label>
            <input type="number" name="durationDays" value={form.durationDays} onChange={change} className="field-light w-full" min="1" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">حصص/شهر</label>
            <input type="number" name="sessionsPerMonth" value={form.sessionsPerMonth} onChange={change} className="field-light w-full" min="1" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">المزايا (سطر لكل ميزة)</label>
          <textarea
            name="featuresAr"
            value={form.featuresAr}
            onChange={change}
            rows={4}
            className="field-light resize-none w-full"
            placeholder={"حصص مباشرة مع معلم خاص\nمتابعة دورية\nتقييمات شهرية"}
          />
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPackagesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [editPkg, setEditPkg] = useState(null)
  const qc = useQueryClient()

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.get('/packages').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/packages', {
      ...data,
      price: Number(data.price),
      durationDays: Number(data.durationDays),
      sessionsPerMonth: Number(data.sessionsPerMonth),
      featuresAr: data.featuresAr ? data.featuresAr.split('\n').map(f => f.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      toast.success('تم إنشاء الباقة')
      qc.invalidateQueries({ queryKey: ['packages'] })
      setShowCreate(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/packages/${id}`, {
      ...data,
      price: data.price !== undefined ? Number(data.price) : undefined,
      durationDays: data.durationDays !== undefined ? Number(data.durationDays) : undefined,
      sessionsPerMonth: data.sessionsPerMonth !== undefined ? Number(data.sessionsPerMonth) : undefined,
      featuresAr: data.featuresAr !== undefined
        ? (typeof data.featuresAr === 'string'
            ? data.featuresAr.split('\n').map(f => f.trim()).filter(Boolean)
            : data.featuresAr)
        : undefined,
    }),
    onSuccess: () => {
      toast.success('تم تحديث الباقة')
      qc.invalidateQueries({ queryKey: ['packages'] })
      setEditPkg(null)
    },
    onError: () => toast.error('حدث خطأ'),
  })

  function handleToggle(pkg) {
    updateMutation.mutate({ id: pkg._id, isActive: !pkg.isActive })
  }

  function handleDuplicate(pkg) {
    createMutation.mutate({
      nameAr: `${pkg.nameAr} (نسخة)`,
      name: pkg.name ? `${pkg.name} Copy` : '',
      descriptionAr: pkg.descriptionAr || '',
      price: pkg.price,
      durationDays: pkg.durationDays,
      sessionsPerMonth: pkg.sessionsPerMonth,
      featuresAr: pkg.featuresAr ? pkg.featuresAr.join('\n') : '',
    })
  }

  function getEditFormValues(pkg) {
    return {
      nameAr: pkg.nameAr || '',
      name: pkg.name || '',
      descriptionAr: pkg.descriptionAr || '',
      price: pkg.price || '',
      durationDays: pkg.durationDays || 30,
      sessionsPerMonth: pkg.sessionsPerMonth || 8,
      featuresAr: pkg.featuresAr ? pkg.featuresAr.join('\n') : '',
    }
  }

  return (
    <div dir="rtl" className="space-y-5 max-w-[1400px]">

      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-gray-900">الباقات والأسعار</h1>
          <p className="text-sm text-gray-500 mt-0.5">{packages.length} باقة — كل باقة قابلة للتعديل والإدارة</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ background: '#7c3aed' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          باقة جديدة
        </button>
      </div>

      {/* Summary Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-gray-700">
              {packages.filter(p => p.isActive).length} باقة نشطة
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-sm font-semibold text-gray-700">
              {packages.filter(p => !p.isActive).length} باقة موقوفة
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-sm font-semibold text-gray-700">
              يبدأ من {Math.min(...packages.map(p => p.price || 0))} ريال
            </span>
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-violet-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg._id}
              pkg={pkg}
              onEdit={(p) => setEditPkg(p)}
              onToggle={handleToggle}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {!isLoading && !packages.length && (
        <div className="bg-white rounded-2xl p-16 border border-gray-100 flex flex-col items-center text-gray-400">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/></svg>
          </div>
          <p className="font-semibold text-gray-500">لا توجد باقات بعد</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#7c3aed' }}
          >
            إضافة أول باقة
          </button>
        </div>
      )}

      {/* Create Modal */}
      <PackageFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(form) => createMutation.mutate(form)}
        loading={createMutation.isPending}
        title="إضافة باقة جديدة"
      />

      {/* Edit Modal */}
      <PackageFormModal
        open={!!editPkg}
        onClose={() => setEditPkg(null)}
        onSubmit={(form) => updateMutation.mutate({ id: editPkg._id, ...form })}
        loading={updateMutation.isPending}
        initialValues={editPkg ? getEditFormValues(editPkg) : null}
        title="تعديل الباقة"
      />
    </div>
  )
}
