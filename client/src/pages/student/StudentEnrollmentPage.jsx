import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr } from '../../utils/date.js'

const STATUS_CONFIG = {
  pending: { label: 'قيد الانتظار', color: 'warning', desc: 'تم إرسال طلبك وسيتم مراجعته قريباً' },
  under_review: { label: 'قيد المراجعة', color: 'info', desc: 'يراجع فريقنا إثبات الدفع' },
  approved: { label: 'تمت الموافقة', color: 'success', desc: 'تمت الموافقة على طلبك وتم تفعيل اشتراكك' },
  rejected: { label: 'يحتاج مراجعة', color: 'danger', desc: 'يرجى التواصل مع الإدارة' },
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'حوالة بنكية' },
  { value: 'cash', label: 'نقداً' },
  { value: 'card', label: 'بطاقة ائتمانية' },
  { value: 'other', label: 'أخرى' },
]

export default function StudentEnrollmentPage() {
  const qc = useQueryClient()
  const fileInputRef = useRef(null)
  const [step, setStep] = useState('packages') // packages | form | status
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [form, setForm] = useState({ paymentMethod: 'bank_transfer', paymentReference: '', studentNotes: '' })
  const [proofFile, setProofFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

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
      setStep('status')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const proofMutation = useMutation({
    mutationFn: ({ id, file }) => {
      const fd = new FormData()
      fd.append('paymentProof', file)
      return api.post(`/enrollments/${id}/payment-proof`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      toast.success('تم رفع إثبات الدفع بنجاح')
      qc.invalidateQueries({ queryKey: ['enrollments', 'me'] })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ في رفع الملف'),
  })

  const activeRequest = myRequests.find(r => ['pending', 'under_review'].includes(r.status))
  const hasActiveRequest = Boolean(activeRequest)
  const approvedRequest = myRequests.find(r => r.status === 'approved')

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setProofFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleSubmit() {
    if (!selectedPackage) return toast.error('يرجى اختيار باقة')
    submitMutation.mutate({
      packageId: selectedPackage._id,
      paymentMethod: form.paymentMethod,
      paymentReference: form.paymentReference,
      studentNotes: form.studentNotes,
    })
  }

  if (pkgLoading || reqLoading) {
    return <div className="flex justify-center py-24"><Spinner color="border-brand-purple" /></div>
  }

  // If approved → show success card
  if (approvedRequest) {
    return (
      <div dir="rtl">
        <PageHeader title="التسجيل" subtitle="حالة الاشتراك والتسجيل" />
        <div className="max-w-lg mx-auto mt-6 card-light p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 className="font-heading font-bold text-2xl text-brand-textBody mb-2">تمت الموافقة على تسجيلك!</h2>
          <p className="text-[#9b7fd6] mb-4">تم تفعيل اشتراكك في باقة <strong>{approvedRequest.packageId?.nameAr}</strong></p>
          <p className="text-sm text-[#9b7fd6]">يمكنك الآن الوصول إلى جدولك الدراسي وحصصك</p>
          <a href="/student" className="mt-6 btn-gold inline-block px-8 py-3 rounded-full font-bold text-sm">الذهاب إلى لوحتي</a>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl">
      <PageHeader
        title="التسجيل في برنامج"
        subtitle={hasActiveRequest ? 'متابعة طلب التسجيل' : 'اختر باقتك وابدأ رحلتك مع ترتيلة'}
      />

      {/* Active request status card */}
      {hasActiveRequest && (
        <div className="mb-6 card-light p-5 border-r-4 border-amber-400">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={STATUS_CONFIG[activeRequest.status]?.color || 'warning'}>
                  {STATUS_CONFIG[activeRequest.status]?.label}
                </Badge>
                <span className="text-xs text-[#9b7fd6]">{formatDateAr(activeRequest.createdAt)}</span>
              </div>
              <div className="font-semibold text-brand-textBody">{activeRequest.packageId?.nameAr}</div>
              <div className="text-sm text-[#9b7fd6] mt-0.5">{STATUS_CONFIG[activeRequest.status]?.desc}</div>
              {activeRequest.adminNotes && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  ملاحظة الإدارة: {activeRequest.adminNotes}
                </div>
              )}
            </div>
            {/* Upload proof button if not uploaded yet */}
            {!activeRequest.paymentProofUrl && (
              <div className="flex-none">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                {proofFile ? (
                  <div className="text-center">
                    <img src={previewUrl} alt="إثبات" className="w-24 h-24 object-cover rounded-xl border-2 border-brand-gold mb-2" />
                    <button
                      onClick={() => proofMutation.mutate({ id: activeRequest._id, file: proofFile })}
                      disabled={proofMutation.isPending}
                      className="btn-gold text-xs px-4 py-2 rounded-full font-bold"
                    >
                      {proofMutation.isPending ? 'جاري الرفع...' : 'تأكيد الرفع'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 text-sm font-semibold transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    رفع إثبات الدفع
                  </button>
                )}
              </div>
            )}
            {activeRequest.paymentProofUrl && (
              <div className="flex-none text-center">
                <img src={activeRequest.paymentProofUrl} alt="إثبات" className="w-24 h-24 object-cover rounded-xl border-2 border-brand-purple" />
                <div className="text-xs text-emerald-600 font-semibold mt-1">تم الرفع ✓</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress steps */}
      {!hasActiveRequest && (
        <>
          <div className="flex items-center justify-center gap-0 mb-8">
            {['اختر الباقة', 'بيانات الدفع', 'التأكيد'].map((label, i) => {
              const stepIndex = i + 1
              const currentIndex = step === 'packages' ? 1 : step === 'form' ? 2 : 3
              const isActive = stepIndex === currentIndex
              const isDone = stepIndex < currentIndex
              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                      isDone ? 'bg-brand-purple border-brand-purple text-white' :
                      isActive ? 'bg-white border-brand-purple text-brand-purple' :
                      'bg-white border-[#e0d8f5] text-[#c4b8e5]'
                    }`}>
                      {isDone ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : stepIndex}
                    </div>
                    <span className={`text-xs mt-1 font-semibold whitespace-nowrap ${isActive ? 'text-brand-purple' : 'text-[#c4b8e5]'}`}>{label}</span>
                  </div>
                  {i < 2 && <div className="w-16 h-px bg-[#e0d8f5] mx-2 mb-5" />}
                </div>
              )
            })}
          </div>

          {/* Step 1: Package selection */}
          {step === 'packages' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {packages.map(pkg => (
                <div
                  key={pkg._id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`card-light p-5 cursor-pointer transition-all hover:shadow-lg ${
                    selectedPackage?._id === pkg._id ? 'ring-2 ring-brand-purple shadow-lg' : ''
                  } ${pkg.isPopular ? 'relative' : ''}`}
                >
                  {pkg.isPopular && (
                    <div className="absolute -top-3 right-1/2 translate-x-1/2 bg-brand-purple text-white text-xs font-bold px-4 py-1 rounded-full">الأكثر طلباً</div>
                  )}
                  <h3 className="font-heading font-bold text-lg text-brand-textBody mb-1">{pkg.nameAr}</h3>
                  <p className="text-sm text-[#9b7fd6] mb-3">{pkg.descriptionAr}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="font-heading font-extrabold text-3xl text-brand-purple">{pkg.price}</span>
                    <span className="text-sm text-[#9b7fd6]">ريال / شهر</span>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {(pkg.featuresAr || []).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-brand-textBody">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {f}
                      </li>
                    ))}
                    <li className="flex items-center gap-2 text-sm text-brand-textBody">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {pkg.sessionsPerMonth} حصة شهرياً
                    </li>
                  </ul>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedPackage(pkg); setStep('form') }}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                      selectedPackage?._id === pkg._id
                        ? 'btn-gold'
                        : 'border border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white'
                    }`}
                  >
                    اختر هذه الباقة
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Payment details form */}
          {step === 'form' && selectedPackage && (
            <div className="max-w-lg mx-auto">
              <div className="card-light p-5 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#9b7fd6] mb-0.5">الباقة المختارة</div>
                  <div className="font-heading font-bold text-brand-textBody">{selectedPackage.nameAr}</div>
                </div>
                <div className="font-heading font-extrabold text-2xl text-brand-purple">{selectedPackage.price} ريال</div>
              </div>

              <div className="card-light p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-brand-textBody mb-1.5">طريقة الدفع</label>
                  <select
                    value={form.paymentMethod}
                    onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}
                    className="field-light w-full"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-textBody mb-1.5">رقم العملية / المرجع (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: TRN20240101"
                    value={form.paymentReference}
                    onChange={e => setForm(p => ({ ...p, paymentReference: e.target.value }))}
                    className="field-light w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-textBody mb-1.5">ملاحظات للإدارة (اختياري)</label>
                  <textarea
                    rows={3}
                    placeholder="أي معلومات إضافية تريد إخبارنا بها..."
                    value={form.studentNotes}
                    onChange={e => setForm(p => ({ ...p, studentNotes: e.target.value }))}
                    className="field-light w-full resize-none"
                  />
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-xs font-bold text-amber-700 mb-1">معلومات التحويل البنكي</div>
                  <div className="text-sm text-amber-700">
                    اسم البنك: بنك الراجحي | رقم IBAN: SA00 0000 0000 0000 0000 0000<br />
                    بعد التحويل، ارفع إثبات الدفع من خلال هذه الصفحة.
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep('packages')} className="flex-1 py-2.5 rounded-xl border border-[#e0d8f5] text-[#9b7fd6] font-semibold text-sm hover:bg-[#faf9ff]">
                    رجوع
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="flex-1 btn-gold py-2.5 rounded-xl font-bold text-sm"
                  >
                    {submitMutation.isPending ? 'جاري الإرسال...' : 'إرسال الطلب'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Previous requests history */}
      {myRequests.length > 0 && (
        <div className="mt-8">
          <h3 className="font-heading font-bold text-brand-textBody mb-3">سجل الطلبات</h3>
          <div className="space-y-3">
            {myRequests.map(req => (
              <div key={req._id} className="card-light p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-sm text-brand-textBody">{req.packageId?.nameAr}</div>
                  <div className="text-xs text-[#9b7fd6] mt-0.5">{formatDateAr(req.createdAt)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-brand-purple">{req.amount} ريال</span>
                  <Badge variant={STATUS_CONFIG[req.status]?.color || 'gray'}>{STATUS_CONFIG[req.status]?.label || req.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
