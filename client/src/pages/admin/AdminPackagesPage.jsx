import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, Copy, Eye, EyeOff, Check, Star,
  MoreVertical, CheckCircle2, XCircle, LayoutGrid, AlertCircle,
} from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx'
import { formatCurrency } from '../../utils/format.js'
import { usePackages } from '../../hooks/usePackages.js'
import { QK } from '../../services/queryKeys.js'
import Can from '../../components/shared/Can.jsx'

const initialForm = {
  nameAr: '',
  name: '',
  descriptionAr: '',
  price: '',
  currency: 'EGP',
  durationDays: 30,
  sessionsPerMonth: 8,
  featuresAr: '',
  showOnLandingPage: true,
  isPopular: false,
  isActive: true,
  sortOrder: 0,
}

// ── Package Action Menu ───────────────────────────────────────────────────────

function ActionMenu({ pkg, onEdit, onToggleActive, onToggleLanding, onDuplicate, onDelete, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const isLandingVisible = pkg.showOnLandingPage !== false

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -6 }}
      transition={{ duration: 0.12 }}
      className="absolute left-0 top-9 z-30 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden py-1"
      style={{ direction: 'rtl' }}
    >
      <button
        onClick={() => { onEdit(pkg); onClose() }}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <Edit2 size={14} className="text-violet-600" />
        تعديل بيانات الباقة
      </button>

      <button
        onClick={() => { onToggleLanding(pkg); onClose() }}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        {isLandingVisible ? (
          <>
            <EyeOff size={14} className="text-amber-500" />
            إخفاء من الصفحة الرئيسية
          </>
        ) : (
          <>
            <Eye size={14} className="text-blue-600" />
            إظهار في الصفحة الرئيسية
          </>
        )}
      </button>

      <button
        onClick={() => { onToggleActive(pkg); onClose() }}
        className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer ${
          pkg.isActive ? 'text-amber-600' : 'text-emerald-600'
        }`}
      >
        {pkg.isActive ? (
          <>
            <XCircle size={14} />
            إيقاف تفعيل الباقة
          </>
        ) : (
          <>
            <CheckCircle2 size={14} />
            تفعيل الباقة
          </>
        )}
      </button>

      <button
        onClick={() => { onDuplicate(pkg); onClose() }}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <Copy size={14} className="text-slate-500" />
        تكرار وإنشاء نسخة
      </button>

      <div className="my-1 border-t border-slate-100" />

      <button
        onClick={() => { onDelete(pkg); onClose() }}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
      >
        <Trash2 size={14} />
        حذف الباقة نهائياً
      </button>
    </motion.div>
  )
}

// ── Package Card ──────────────────────────────────────────────────────────────

function PackageCard({ pkg, onEdit, onToggleActive, onToggleLanding, onDuplicate, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isLandingVisible = pkg.showOnLandingPage !== false

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`relative bg-white rounded-2xl border transition-all flex flex-col justify-between ${
        pkg.isPopular
          ? 'border-violet-300 shadow-md ring-1 ring-violet-100'
          : 'border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Popular badge */}
      {pkg.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-sm flex items-center gap-1" style={{ background: '#7c3aed' }}>
          <Star size={11} className="fill-amber-300 text-amber-300" />
          الأكثر شيوعاً
        </div>
      )}

      <div className="p-5 flex-1">
        {/* Header & Badges */}
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              {/* Active status */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                pkg.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pkg.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {pkg.isActive ? 'نشط' : 'موقوف'}
              </span>

              {/* Landing page visibility badge */}
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isLandingVisible
                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                  : 'bg-slate-50 text-slate-400 border border-slate-200'
              }`}>
                {isLandingVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                {isLandingVisible ? 'معروضة بالرئيسية' : 'مخفية من الرئيسية'}
              </span>
            </div>

            <h3 className="font-heading font-extrabold text-slate-900 text-lg leading-snug truncate">
              {pkg.nameAr}
            </h3>
            {pkg.name && <div className="text-xs text-slate-400 font-medium">{pkg.name}</div>}
          </div>

          {/* 3-dots Menu Button */}
          <div className="relative flex-none">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="إجراءات إضافية"
            >
              <MoreVertical size={16} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <ActionMenu
                  pkg={pkg}
                  onEdit={onEdit}
                  onToggleActive={onToggleActive}
                  onToggleLanding={onToggleLanding}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Price Row */}
        <div className="mb-3.5 pb-3 border-b border-slate-100">
          <div className="flex items-baseline gap-1">
            <span className="font-heading font-extrabold text-2xl sm:text-3xl text-violet-700" dir="ltr">
              {formatCurrency(pkg.price, pkg.currency)}
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
            <span>{pkg.durationDays} يوم</span>
            <span>•</span>
            <span>{pkg.sessionsPerMonth} حصة شهرياً</span>
          </div>
        </div>

        {/* Description */}
        {pkg.descriptionAr && (
          <p className="text-xs text-slate-500 mb-3.5 line-clamp-2 leading-relaxed">{pkg.descriptionAr}</p>
        )}

        {/* Features Preview */}
        {pkg.featuresAr?.length > 0 && (
          <ul className="space-y-1.5 mb-2">
            {pkg.featuresAr.slice(0, 4).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <Check size={13} className="flex-none mt-0.5 text-emerald-500" />
                <span className="truncate">{f}</span>
              </li>
            ))}
            {pkg.featuresAr.length > 4 && (
              <li className="text-[11px] text-slate-400 pe-5 font-medium">
                +{pkg.featuresAr.length - 4} مزايا إضافية
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Bottom Card Action Bar */}
      <div className="p-3 bg-slate-50/70 border-t border-slate-100 rounded-b-2xl flex items-center gap-1.5">
        <button
          onClick={() => onEdit(pkg)}
          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold text-violet-700 hover:bg-violet-50 transition-colors cursor-pointer border border-transparent hover:border-violet-100 text-center"
        >
          تعديل
        </button>

        <button
          onClick={() => onToggleLanding(pkg)}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border text-center ${
            isLandingVisible
              ? 'text-blue-700 bg-white border-blue-200 hover:bg-blue-50'
              : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
          }`}
          title={isLandingVisible ? 'انقر لإخفاء الباقة من الرئيسية' : 'انقر لإظهار الباقة في الرئيسية'}
        >
          {isLandingVisible ? 'إخفاء بالرئيسية' : 'إظهار بالرئيسية'}
        </button>

        <button
          onClick={() => onToggleActive(pkg)}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer border text-center ${
            pkg.isActive
              ? 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
              : 'text-emerald-700 bg-white border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          {pkg.isActive ? 'إيقاف' : 'تفعيل'}
        </button>

        <button
          onClick={() => onDelete(pkg)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200 flex-none"
          title="حذف الباقة"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}

// ── Package Form Modal (UI/UX Pro Max) ──────────────────────────────────────────

function PackageFormModal({ open, onClose, onSubmit, loading, initialValues, title }) {
  const [form, setForm] = useState(initialValues || initialForm)

  useEffect(() => {
    if (open) setForm(initialValues || initialForm)
  }, [open, initialValues])

  function change(e) {
    const { name, value, type, checked } = e.target
    setForm(p => ({
      ...p,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleSubmit(e) {
    e?.preventDefault()
    if (!form.nameAr?.trim()) return toast.error('يرجى كتابة اسم الباقة بالعربية')
    if (form.price === '' || isNaN(Number(form.price))) return toast.error('يرجى تحديد سعر صالح للباقة')
    onSubmit(form)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="cursor-pointer">
            إلغاء
          </Button>
          <Button variant="purple" onClick={handleSubmit} loading={loading} className="cursor-pointer font-bold">
            {title === 'إضافة باقة جديدة' ? 'إنشاء الباقة' : 'حفظ التعديلات'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم الباقة بالعربية <span className="text-rose-500">*</span>
            </label>
            <input
              name="nameAr"
              value={form.nameAr}
              onChange={change}
              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              placeholder="مثال: الباقة الذهبية"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم بالإنجليزية (اختياري)</label>
            <input
              name="name"
              value={form.name}
              onChange={change}
              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              placeholder="e.g. Gold Package"
              dir="ltr"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف الباقة</label>
          <input
            name="descriptionAr"
            value={form.descriptionAr}
            onChange={change}
            className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-sm font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
            placeholder="وصف تسويقي مختصر يوضح ميزة الباقة..."
          />
        </div>

        {/* Price, Currency, Duration & Sessions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              السعر <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={change}
              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-sm font-bold text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">العملة</label>
            <select
              name="currency"
              value={form.currency || 'EGP'}
              onChange={change}
              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-800 outline-none transition-all cursor-pointer"
            >
              <option value="EGP">EGP (جنيه)</option>
              <option value="SAR">SAR (ريال)</option>
              <option value="USD">USD ($)</option>
              <option value="AED">AED (درهم)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">المدة (أيام)</label>
            <input
              type="number"
              name="durationDays"
              value={form.durationDays}
              onChange={change}
              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-sm font-semibold text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              min="1"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">حصص / شهر</label>
            <input
              type="number"
              name="sessionsPerMonth"
              value={form.sessionsPerMonth}
              onChange={change}
              className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3.5 text-sm font-semibold text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              min="1"
            />
          </div>
        </div>

        {/* Features */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            مزايا الباقة (ميزة واحدة في كل سطر)
          </label>
          <textarea
            name="featuresAr"
            value={form.featuresAr}
            onChange={change}
            rows={4}
            className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 resize-none leading-relaxed"
            placeholder={"أربع حلقات أسبوعياً\nمتابعة مستمرة وإشراف أكاديمي\nتصحيح التلاوة والتسميع\nمدة الحلقة 30 دقيقة"}
          />
        </div>

        {/* Visibility & Behavior Toggles Card */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="text-xs font-bold text-slate-800 mb-1">إعدادات العرض والظهور للمستخدمين</div>

          {/* Show on Landing Page Toggle */}
          <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 hover:border-violet-200 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              name="showOnLandingPage"
              checked={form.showOnLandingPage !== false}
              onChange={change}
              className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 mt-0.5 flex-none"
            />
            <div className="text-right">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Eye size={13} className="text-blue-600" />
                عرض الباقة في الصفحة الرئيسية للموقع (Landing Page)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                تظهر الباقة لزوار الموقع في قسم الأسعار الرئيسي، ويمكنك إخفاؤها والاكتفاء بعرضها داخل لوحة التحكم وصفحة الأسعار الكاملة.
              </div>
            </div>
          </label>

          {/* Is Popular Toggle */}
          <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 hover:border-violet-200 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              name="isPopular"
              checked={Boolean(form.isPopular)}
              onChange={change}
              className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 mt-0.5 flex-none"
            />
            <div className="text-right">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Star size={13} className="text-amber-500 fill-amber-500" />
                تمييز الباقة كـ «الأكثر طلباً» (Popular Plan)
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                إبراز كارت الباقة بإطار ذهبي أنيق وشارة تسويقية مميزة لجذب المشتركين.
              </div>
            </div>
          </label>

          {/* Is Active Toggle */}
          <label className="flex items-start gap-3 p-2.5 bg-white rounded-xl border border-slate-200/70 hover:border-violet-200 transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              name="isActive"
              checked={Boolean(form.isActive)}
              onChange={change}
              className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 mt-0.5 flex-none"
            />
            <div className="text-right">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                تفعيل الباقة للاشتراك
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                إتاحة الباقة في قوائم الاشتراك وتسجيل الطلاب، وإلغاء تفعيلها يوقف استقبال الاشتراكات الجديدة فورياً.
              </div>
            </div>
          </label>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPackagesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [editPkg, setEditPkg] = useState(null)
  const [deleteConfirmPkg, setDeleteConfirmPkg] = useState(null)
  const qc = useQueryClient()

  const { packages, isLoading } = usePackages({ activeOnly: false })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/packages', {
      ...data,
      price: Number(data.price),
      durationDays: Number(data.durationDays),
      sessionsPerMonth: Number(data.sessionsPerMonth),
      sortOrder: Number(data.sortOrder) || 0,
      showOnLandingPage: Boolean(data.showOnLandingPage),
      featuresAr: data.featuresAr ? data.featuresAr.split('\n').map(f => f.trim()).filter(Boolean) : [],
    }),
    onSuccess: () => {
      toast.success('تم إنشاء الباقة بنجاح')
      qc.invalidateQueries({ queryKey: QK.PACKAGES })
      setShowCreate(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ أثناء إنشاء الباقة'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/packages/${id}`, {
      ...data,
      price: data.price !== undefined ? Number(data.price) : undefined,
      durationDays: data.durationDays !== undefined ? Number(data.durationDays) : undefined,
      sessionsPerMonth: data.sessionsPerMonth !== undefined ? Number(data.sessionsPerMonth) : undefined,
      sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
      showOnLandingPage: data.showOnLandingPage !== undefined ? Boolean(data.showOnLandingPage) : undefined,
      featuresAr: data.featuresAr !== undefined
        ? (typeof data.featuresAr === 'string'
            ? data.featuresAr.split('\n').map(f => f.trim()).filter(Boolean)
            : data.featuresAr)
        : undefined,
    }),
    onSuccess: () => {
      toast.success('تم تحديث الباقة بنجاح')
      qc.invalidateQueries({ queryKey: QK.PACKAGES })
      setEditPkg(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ أثناء تحديث الباقة'),
  })

  const deleteMutation = useMutation({
    mutationFn: (pkgId) => api.delete(`/packages/${pkgId}`).then(r => r.data),
    onSuccess: () => {
      toast.success('تم حذف الباقة بنجاح')
      qc.invalidateQueries({ queryKey: QK.PACKAGES })
      setDeleteConfirmPkg(null)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'تعذر حذف الباقة لوجود اشتراكات مرتبطة بها')
      setDeleteConfirmPkg(null)
    },
  })

  function handleToggleActive(pkg) {
    updateMutation.mutate({ id: pkg._id, isActive: !pkg.isActive })
  }

  function handleToggleLanding(pkg) {
    const nextVal = !(pkg.showOnLandingPage !== false)
    updateMutation.mutate({ id: pkg._id, showOnLandingPage: nextVal })
    toast.success(nextVal ? 'تم إدراج الباقة في الصفحة الرئيسية' : 'تم إخفاء الباقة من الصفحة الرئيسية')
  }

  function handleDuplicate(pkg) {
    createMutation.mutate({
      nameAr: `${pkg.nameAr} (نسخة)`,
      name: pkg.name ? `${pkg.name} Copy` : '',
      descriptionAr: pkg.descriptionAr || '',
      price: pkg.price,
      currency: pkg.currency || 'EGP',
      durationDays: pkg.durationDays || 30,
      sessionsPerMonth: pkg.sessionsPerMonth || 8,
      showOnLandingPage: pkg.showOnLandingPage !== false,
      isPopular: false,
      isActive: true,
      featuresAr: pkg.featuresAr ? pkg.featuresAr.join('\n') : '',
    })
  }

  function getEditFormValues(pkg) {
    return {
      nameAr: pkg.nameAr || '',
      name: pkg.name || '',
      descriptionAr: pkg.descriptionAr || '',
      price: pkg.price || '',
      currency: pkg.currency || 'EGP',
      durationDays: pkg.durationDays || 30,
      sessionsPerMonth: pkg.sessionsPerMonth || 8,
      featuresAr: pkg.featuresAr ? pkg.featuresAr.join('\n') : '',
      showOnLandingPage: pkg.showOnLandingPage !== false,
      isPopular: Boolean(pkg.isPopular),
      isActive: Boolean(pkg.isActive),
      sortOrder: pkg.sortOrder || 0,
    }
  }

  const landingPackagesCount = packages.filter(p => p.isActive && p.showOnLandingPage !== false).length

  return (
    <div dir="rtl" className="space-y-5">

      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900">الباقات والأسعار</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            إدارة الباقات والخطط التعليمية والتحكم في ظهورها في الموقع الرئيسي
          </p>
        </div>
        <Can permission="packages.manage">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 transition-all shadow-sm shadow-violet-200 cursor-pointer"
          >
            <Plus size={16} />
            باقة جديدة
          </button>
        </Can>
      </div>

      {/* Summary Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs sm:text-sm font-bold text-slate-700">
              {packages.filter(p => p.isActive).length} باقة نشطة
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs sm:text-sm font-bold text-blue-700">
              {landingPackagesCount} معروضة بالصفحة الرئيسية
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="text-xs sm:text-sm font-semibold text-slate-500">
              {packages.filter(p => !p.isActive).length} باقة موقوفة
            </span>
          </div>

          {packages.some(p => p.isActive) && (
            <div className="flex items-center gap-2 ms-auto">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <span className="text-xs sm:text-sm font-bold text-slate-700" dir="ltr">
                يبدأ من {formatCurrency(
                  Math.min(...packages.filter(p => p.isActive).map(p => p.price || 0)),
                  packages.find(p => p.isActive)?.currency
                )}
              </span>
            </div>
          )}
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
              onToggleActive={handleToggleActive}
              onToggleLanding={handleToggleLanding}
              onDuplicate={handleDuplicate}
              onDelete={(p) => setDeleteConfirmPkg(p)}
            />
          ))}
        </div>
      )}

      {!isLoading && !packages.length && (
        <div className="bg-white rounded-2xl p-16 border border-slate-200/80 flex flex-col items-center text-slate-400">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 text-violet-600">
            <LayoutGrid size={28} />
          </div>
          <p className="font-bold text-slate-700 text-base">لا توجد باقات مسجلة بعد</p>
          <p className="text-xs text-slate-400 mt-1">ابدأ بإنشاء أول باقة تعليمية لتقديمها للطلاب</p>
          <Can permission="packages.manage">
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors cursor-pointer shadow-sm shadow-violet-200"
            >
              إضافة أول باقة
            </button>
          </Can>
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmPkg && (
        <ConfirmDialog
          open={Boolean(deleteConfirmPkg)}
          onClose={() => setDeleteConfirmPkg(null)}
          onConfirm={() => deleteMutation.mutate(deleteConfirmPkg._id)}
          title="تأكيد حذف الباقة"
          message={`هل أنت متأكد من حذف «${deleteConfirmPkg.nameAr}» نهائياً من المنصة؟ لن يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="نعم، احذف الباقة"
          cancelLabel="تراجع"
          variant="danger"
          loading={deleteMutation.isPending}
        />
      )}
    </div>
  )
}

