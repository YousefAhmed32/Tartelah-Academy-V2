import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Search, CircleCheck, AlertTriangle, Building2, Banknote, CreditCard, ClipboardList, X, Package } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr } from '../../utils/date.js'
import { getFileUrl, ROUTES } from '../../config/constants.js'

const STATUS_CONFIG = {
  pending:      { label: 'قيد الانتظار',  color: 'warning', desc: 'تم إرسال طلبك وسيتم مراجعته قريباً',              Icon: Search },
  under_review: { label: 'قيد المراجعة',  color: 'info',    desc: 'يراجع فريقنا طلبك وإثبات الدفع',                Icon: Search },
  approved:     { label: 'تمت الموافقة',  color: 'success', desc: 'تمت الموافقة على طلبك وتم تفعيل اشتراكك',       Icon: CircleCheck },
  rejected:     { label: 'يحتاج مراجعة', color: 'danger',  desc: 'يرجى التواصل مع الإدارة للاستفسار',            Icon: AlertTriangle },
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'حوالة بنكية',       Icon: Building2 },
  { value: 'cash',          label: 'نقداً',              Icon: Banknote },
  { value: 'card',          label: 'بطاقة ائتمانية',    Icon: CreditCard },
  { value: 'other',         label: 'أخرى',               Icon: ClipboardList },
]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.2, 0.7, 0.2, 1] },
})

export default function StudentEnrollmentPage() {
  const qc = useQueryClient()
  const fileInputRef = useRef(null)
  const [step, setStep] = useState('packages')
  const [selectedPackage, setSelectedPackage] = useState(null)
  // If the student arrived here after choosing a teacher on the public
  // Teachers page (see TeacherProfilePage's "سجّل الآن مع ..." CTA), carry
  // that preference into the request as a note for the admin who assigns
  // the teacher on approval — there's no dedicated field for this on
  // EnrollmentRequest, and adding one would duplicate the admin's actual
  // assignment step.
  const [form, setForm] = useState(() => {
    const preferredTeacherName = localStorage.getItem('preferredTeacherName')
    return {
      paymentMethod: 'bank_transfer',
      paymentReference: '',
      studentNotes: preferredTeacherName ? `أرغب بالتسجيل مع ${preferredTeacherName} إن أمكن.` : '',
    }
  })
  const [proofFile, setProofFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [lightboxUrl, setLightboxUrl] = useState(null)

  const { data: packages = [], isLoading: pkgLoading } = useQuery({
    queryKey: ['packages', 'active'],
    queryFn: () => api.get('/packages').then(r => r.data.data?.filter(p => p.isActive) || []),
  })

  const { data: myRequests = [], isLoading: reqLoading } = useQuery({
    queryKey: ['enrollments', 'me'],
    queryFn: () => api.get('/enrollments/me').then(r => r.data.data || []),
  })

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/enrollments', data),
    onSuccess: () => {
      toast.success('تم إرسال طلب التسجيل بنجاح')
      qc.invalidateQueries({ queryKey: ['enrollments', 'me'] })
      localStorage.removeItem('preferredTeacherId')
      localStorage.removeItem('preferredTeacherName')
      setStep('status')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const proofMutation = useMutation({
    mutationFn: ({ id, file }) => {
      const fd = new FormData()
      fd.append('paymentProof', file)
      return api.post(`/enrollments/${id}/payment-proof`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      toast.success('تم رفع إثبات الدفع بنجاح')
      qc.invalidateQueries({ queryKey: ['enrollments', 'me'] })
      setProofFile(null)
      setPreviewUrl(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ في رفع الملف'),
  })

  const activeRequest   = myRequests.find(r => ['pending', 'under_review'].includes(r.status))
  const approvedRequest = myRequests.find(r => r.status === 'approved')

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const maxMB = 5
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`حجم الملف يتجاوز ${maxMB} MB`)
      return
    }
    setProofFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  function handleSubmit() {
    if (!selectedPackage) return toast.error('يرجى اختيار باقة')
    submitMutation.mutate({
      packageId:        selectedPackage._id,
      paymentMethod:    form.paymentMethod,
      paymentReference: form.paymentReference,
      studentNotes:     form.studentNotes,
    })
  }

  if (pkgLoading || reqLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner color="border-brand-purple" />
      </div>
    )
  }

  // ── Approved state ───────────────────────────────────────────────────────
  if (approvedRequest) {
    return (
      <div dir="rtl">
        <PageHeader title="التسجيل" subtitle="حالة الاشتراك والتسجيل" />
        <motion.div {...fadeUp(0)} className="max-w-lg mx-auto mt-4">
          <div className="card-light p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="m5 13 4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="font-heading font-bold text-2xl text-brand-textBody mb-2">تمت الموافقة!</h2>
            <p className="text-[#9b7fd6] mb-4 leading-relaxed">
              تم تفعيل اشتراكك في باقة{' '}
              <strong className="text-brand-textBody">{approvedRequest.packageId?.nameAr}</strong>
              . يمكنك الآن الوصول إلى جدولك الدراسي وحصصك.
            </p>
            <Link to={ROUTES.STUDENT_DASHBOARD} className="btn-gold inline-block px-8 py-3 rounded-full font-bold text-sm">
              الذهاب إلى لوحتي
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div dir="rtl">
      <PageHeader
        title="التسجيل في برنامج"
        subtitle={activeRequest ? 'متابعة طلب التسجيل' : 'اختر باقتك وابدأ رحلتك مع ترتيلة'}
      />

      {/* ── Active request status ─────────────────────────────────────── */}
      {activeRequest && (
        <motion.div {...fadeUp(0)} className="mb-6">
          <ActiveRequestCard
            request={activeRequest}
            proofFile={proofFile}
            previewUrl={previewUrl}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            onUpload={() => proofMutation.mutate({ id: activeRequest._id, file: proofFile })}
            onPreview={(url) => setLightboxUrl(url)}
            uploading={proofMutation.isPending}
          />
        </motion.div>
      )}

      {/* ── Step flow (only when no active request) ───────────────────── */}
      {!activeRequest && (
        <>
          {/* Stepper */}
          <div className="flex items-center justify-center gap-0 mb-8">
            {['اختر الباقة', 'بيانات الدفع', 'التأكيد'].map((label, i) => {
              const idx = i + 1
              const cur = step === 'packages' ? 1 : step === 'form' ? 2 : 3
              const done = idx < cur
              const active = idx === cur
              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      done   ? 'bg-brand-purple border-brand-purple text-white'
                      : active ? 'bg-white border-brand-purple text-brand-purple'
                      :          'bg-white border-[#e0d8f5] text-[#c4b8e5]'
                    }`}>
                      {done
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : idx
                      }
                    </div>
                    <span className={`text-xs mt-1 font-semibold whitespace-nowrap ${active ? 'text-brand-purple' : 'text-[#c4b8e5]'}`}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && <div className="w-14 h-px bg-[#e0d8f5] mx-2 mb-5" />}
                </div>
              )
            })}
          </div>

          {/* Step 1: Package selection */}
          {step === 'packages' && (
            <PackageGrid
              packages={packages}
              selected={selectedPackage}
              onSelect={(pkg) => { setSelectedPackage(pkg); setStep('form') }}
            />
          )}

          {/* Step 2: Payment form */}
          {step === 'form' && selectedPackage && (
            <PaymentForm
              pkg={selectedPackage}
              form={form}
              onChange={(patch) => setForm(p => ({ ...p, ...patch }))}
              onBack={() => setStep('packages')}
              onSubmit={handleSubmit}
              submitting={submitMutation.isPending}
            />
          )}
        </>
      )}

      {/* ── Request history ───────────────────────────────────────────── */}
      {myRequests.length > 0 && (
        <motion.div {...fadeUp(0.1)} className="mt-8">
          <h3 className="font-heading font-bold text-brand-textBody mb-3">سجل الطلبات</h3>
          <div className="space-y-3">
            {myRequests.map(req => {
              const cfg = STATUS_CONFIG[req.status] || {}
              return (
                <div key={req._id} className="card-light p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm text-brand-textBody">{req.packageId?.nameAr}</div>
                    <div className="text-xs text-[#9b7fd6] mt-0.5">{formatDateAr(req.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-brand-purple">{req.amount} ريال</span>
                    <Badge variant={cfg.color || 'gray'}>{cfg.label || req.status}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
            onClick={() => setLightboxUrl(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={lightboxUrl}
              alt="إثبات الدفع"
              className="max-w-full max-h-[85vh] rounded-[18px] object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Active Request Status Card ─────────────────────────────────────────────
function ActiveRequestCard({ request, proofFile, previewUrl, fileInputRef, onFileChange, onUpload, onPreview, uploading }) {
  const cfg = STATUS_CONFIG[request.status] || {}
  const proofUrl = getFileUrl(request.paymentProofUrl)

  return (
    <div
      className="card-light p-5"
      style={{ borderRight: `4px solid ${request.status === 'under_review' ? '#3b82f6' : '#f59e0b'}` }}
    >
      <div className="flex flex-col gap-4">
        {/* Status header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Badge variant={cfg.color || 'warning'}>{cfg.label}</Badge>
              <span className="text-xs text-[#9b7fd6]">{formatDateAr(request.createdAt)}</span>
            </div>
            <div className="font-heading font-bold text-lg text-brand-textBody">
              {request.packageId?.nameAr}
            </div>
            <div className="text-sm text-[#9b7fd6] mt-0.5">{cfg.desc}</div>
            {request.adminNotes && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 border border-red-100">
                <span className="font-bold">ملاحظة الإدارة:</span> {request.adminNotes}
              </div>
            )}
          </div>

          {/* Upload proof section */}
          <div className="flex-none">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
            />

            {/* Already uploaded proof */}
            {proofUrl && !proofFile && (
              <div className="text-center">
                <button
                  onClick={() => onPreview(proofUrl)}
                  className="block relative group"
                >
                  <img
                    src={proofUrl}
                    alt="إثبات الدفع"
                    className="w-28 h-28 object-cover rounded-xl border-2 border-brand-purple shadow-md"
                  />
                  <div className="absolute inset-0 rounded-xl bg-brand-purple/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold bg-brand-purple/80 px-2 py-1 rounded-lg">تكبير</span>
                  </div>
                </button>
                <div className="text-xs text-emerald-600 font-semibold mt-1.5 flex items-center gap-1 justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  تم الرفع
                </div>
              </div>
            )}

            {/* Preview before upload */}
            {proofFile && previewUrl && (
              <div className="text-center">
                <button onClick={() => onPreview(previewUrl)} className="block">
                  <img
                    src={previewUrl}
                    alt="معاينة"
                    className="w-28 h-28 object-cover rounded-xl border-2 border-brand-gold shadow-md"
                  />
                </button>
                <div className="flex flex-col gap-1.5 mt-2">
                  <button
                    onClick={onUpload}
                    disabled={uploading}
                    className="btn-gold text-xs px-4 py-1.5 rounded-lg font-bold"
                  >
                    {uploading ? 'جاري الرفع...' : 'تأكيد الرفع'}
                  </button>
                  <button
                    onClick={() => { /* will be handled by fileInputRef click */ fileInputRef.current?.click() }}
                    className="text-xs text-[#9b7fd6] hover:text-brand-purple"
                  >
                    تغيير الصورة
                  </button>
                </div>
              </div>
            )}

            {/* Upload prompt */}
            {!proofUrl && !proofFile && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 px-5 py-5 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 transition-colors text-center"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-sm font-semibold leading-tight">رفع إثبات<br />الدفع</span>
              </button>
            )}
          </div>
        </div>

        {/* Status steps */}
        <div className="flex items-center gap-0 pt-2" style={{ borderTop: '1px solid #f0ecf8' }}>
          {[
            { key: 'pending',      label: 'إرسال الطلب' },
            { key: 'under_review', label: 'رفع الإثبات' },
            { key: 'approved',     label: 'المراجعة'    },
          ].map((s, i) => {
            const statusOrder = ['pending', 'under_review', 'approved']
            const reqIdx  = statusOrder.indexOf(request.status)
            const stepIdx = statusOrder.indexOf(s.key)
            const done    = reqIdx > stepIdx || request.status === 'approved'
            const active  = s.key === request.status
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    done   ? 'bg-brand-purple border-brand-purple text-white'
                    : active ? 'bg-white border-brand-purple text-brand-purple'
                    :          'bg-white border-[#e0d8f5] text-[#c4b8e5]'
                  }`}>
                    {done
                      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : i + 1
                    }
                  </div>
                  <span className={`text-[11px] mt-1 font-semibold text-center ${active ? 'text-brand-purple' : 'text-[#c4b8e5]'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div className="flex-none w-8 h-px bg-[#e0d8f5] mb-4" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Package Grid ───────────────────────────────────────────────────────────
function PackageGrid({ packages, selected, onSelect }) {
  if (packages.length === 0) {
    return (
      <div className="text-center py-16 card-light">
        <Package size={52} strokeWidth={1.3} color="#9b7fd6" className="mb-4 mx-auto" />
        <h3 className="font-heading font-bold text-xl text-brand-textBody mb-2">لا توجد باقات متاحة</h3>
        <p className="text-[#9b7fd6]">تواصل مع الإدارة للاستفسار عن البرامج المتاحة</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {packages.map((pkg, i) => (
        <motion.div key={pkg._id} {...fadeUp(i * 0.06)}>
          <div
            onClick={() => onSelect(pkg)}
            className={`card-light p-6 cursor-pointer transition-all hover:shadow-lift relative overflow-hidden ${
              selected?._id === pkg._id ? 'ring-2 ring-brand-purple shadow-purple' : ''
            }`}
          >
            {pkg.isPopular && (
              <div className="absolute -top-px right-1/2 translate-x-1/2 bg-purple-gradient text-white text-xs font-bold px-4 py-1 rounded-b-xl">
                الأكثر طلباً
              </div>
            )}
            <div className="mt-2">
              <h3 className="font-heading font-bold text-xl text-brand-textBody mb-1">{pkg.nameAr}</h3>
              <p className="text-sm text-[#9b7fd6] mb-4">{pkg.descriptionAr}</p>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="font-heading font-extrabold text-3xl text-brand-purple">{pkg.price}</span>
                <span className="text-sm text-[#9b7fd6]">ريال / شهر</span>
              </div>
              <ul className="space-y-2 mb-5">
                <li className="flex items-center gap-2 text-sm text-brand-textBody">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {pkg.sessionsPerMonth} حصة شهرياً
                </li>
                {(pkg.featuresAr || []).map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2 text-sm text-brand-textBody">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(pkg) }}
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                  selected?._id === pkg._id ? 'btn-gold' : 'border border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white'
                }`}
              >
                اختر هذه الباقة
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── Payment Form ───────────────────────────────────────────────────────────
function PaymentForm({ pkg, form, onChange, onBack, onSubmit, submitting }) {
  return (
    <motion.div {...fadeUp(0)} className="max-w-lg mx-auto">
      {/* Selected package summary */}
      <div className="card-light p-4 mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-[#9b7fd6] mb-0.5">الباقة المختارة</div>
          <div className="font-heading font-bold text-brand-textBody">{pkg.nameAr}</div>
        </div>
        <div className="font-heading font-extrabold text-2xl text-brand-purple">{pkg.price} ريال</div>
      </div>

      <div className="card-light p-6 space-y-4">
        {/* Payment method */}
        <div>
          <label className="block text-xs font-bold text-brand-textBody mb-2">طريقة الدفع</label>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.value}
                onClick={() => onChange({ paymentMethod: m.value })}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  form.paymentMethod === m.value
                    ? 'border-brand-purple bg-purple-50 text-brand-purple'
                    : 'border-[#e8e0f5] text-brand-textBody hover:border-brand-purple/50'
                }`}
              >
                <m.Icon size={16} strokeWidth={1.8} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reference */}
        <div>
          <label className="block text-xs font-bold text-brand-textBody mb-1.5">رقم العملية / المرجع (اختياري)</label>
          <input
            type="text"
            placeholder="مثال: TRN20240101"
            value={form.paymentReference}
            onChange={e => onChange({ paymentReference: e.target.value })}
            className="field-light w-full"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-brand-textBody mb-1.5">ملاحظات للإدارة (اختياري)</label>
          <textarea
            rows={3}
            placeholder="أي معلومات إضافية تريد إخبارنا بها..."
            value={form.studentNotes}
            onChange={e => onChange({ studentNotes: e.target.value })}
            className="field-light w-full resize-none"
          />
        </div>

        {/* Bank info */}
        <div className="p-4 rounded-[14px]" style={{ background: 'rgba(232,199,106,0.08)', border: '1px solid rgba(232,199,106,0.2)' }}>
          <div className="text-xs font-bold mb-2" style={{ color: '#9a6e00' }}>معلومات التحويل البنكي</div>
          <div className="text-sm space-y-1" style={{ color: '#7a5900' }}>
            <div>البنك: <strong>بنك الراجحي</strong></div>
            <div>IBAN: <strong className="text-xs">SA00 0000 0000 0000 0000 0000</strong></div>
            <div className="text-xs mt-2 text-amber-700">بعد التحويل، ارفع إثبات الدفع من هذه الصفحة.</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onBack}
            className="flex-1 py-2.5 rounded-xl border border-[#e0d8f5] text-[#9b7fd6] font-semibold text-sm hover:bg-[#faf9ff] transition-colors"
          >
            رجوع
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex-1 btn-gold py-2.5 rounded-xl font-bold text-sm"
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
