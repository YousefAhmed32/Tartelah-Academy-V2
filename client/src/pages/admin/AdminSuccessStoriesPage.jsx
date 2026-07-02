import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import { getFileUrl } from '../../config/constants.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ImageUploadField from '../../components/ui/ImageUploadField.jsx'

const ROLE_META = {
  teacher: { label: 'أفضل معلم', hint: 'مثال: أ. أحمد حسن', badgeDefault: '🏆 أفضل معلم' },
  student: { label: 'أفضل طالب', hint: 'مثال: الطالبة سارة محمد', badgeDefault: '⭐ أفضل طالب' },
  achievement: { label: 'أفضل إنجاز', hint: 'مثال: إتمام حفظ جزء عم', badgeDefault: '🎯 أفضل إنجاز' },
}

// ── Light switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className="relative w-10 h-[22px] rounded-full transition-all flex-none"
        style={{ background: checked ? '#7c3aed' : '#E5E7EB' }}
      >
        <div
          className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? '20px' : '3px' }}
        />
      </div>
      {label && <span className="text-sm font-medium text-brand-textBody">{label}</span>}
    </label>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#374151] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ── Card editor panel ─────────────────────────────────────────────────────────

function CardEditor({ card, onField, onUploadImage, onRemoveImage }) {
  const meta = ROLE_META[card.role]
  return (
    <div className="card-light p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-base text-brand-textBody">{meta.label}</h3>
        <Toggle checked={card.isActive} onChange={v => onField('isActive', v)} label={card.isActive ? 'مفعّلة' : 'معطّلة'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5">
        <ImageUploadField
          currentUrl={card.image}
          aspect={0.72}
          recommendedSizeText="مقاس مقترح 720×1000 بكسل"
          onUpload={onUploadImage}
          onRemove={card.image ? onRemoveImage : undefined}
          height={220}
        />

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="الاسم">
              <input value={card.nameAr} onChange={e => onField('nameAr', e.target.value)} placeholder={meta.hint} className="field-light w-full" />
            </Field>
            <Field label="الشارة">
              <input value={card.badgeAr} onChange={e => onField('badgeAr', e.target.value)} placeholder={meta.badgeDefault} className="field-light w-full" />
            </Field>
          </div>
          <Field label="العنوان الفرعي">
            <input value={card.titleAr} onChange={e => onField('titleAr', e.target.value)} placeholder="مثال: أكثر المعلمين تقييمًا هذا الشهر" className="field-light w-full" />
          </Field>
          <Field label="الوصف المختصر">
            <textarea value={card.descriptionAr} onChange={e => onField('descriptionAr', e.target.value)} rows={2} className="field-light w-full resize-none" />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="نص الزر (اختياري)">
              <input value={card.ctaText} onChange={e => onField('ctaText', e.target.value)} placeholder="عرض التفاصيل" className="field-light w-full" />
            </Field>
            <Field label="رابط الزر (اختياري)">
              <input value={card.ctaLink} onChange={e => onField('ctaLink', e.target.value)} placeholder="/teachers" className="field-light w-full" dir="ltr" />
            </Field>
            <Field label="ترتيب العرض">
              <input type="number" value={card.order} onChange={e => onField('order', Number(e.target.value))} className="field-light w-full" />
            </Field>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Banner editor panel ───────────────────────────────────────────────────────

function BannerEditor({ banner, onField, onUploadImage, onRemoveImage }) {
  return (
    <div className="card-light p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-base text-brand-textBody">البانر الواحد</h3>
        <Toggle checked={banner.isActive} onChange={v => onField('isActive', v)} label={banner.isActive ? 'مفعّل' : 'معطّل'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr] gap-5">
        <ImageUploadField
          currentUrl={banner.image}
          aspect={21 / 9}
          recommendedSizeText="مقاس مقترح 1600×686 بكسل (نسبة 21:9)"
          onUpload={onUploadImage}
          onRemove={banner.image ? onRemoveImage : undefined}
          height={220}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="العنوان الرئيسي">
            <input value={banner.titleAr} onChange={e => onField('titleAr', e.target.value)} placeholder="نجوم منصتنا" className="field-light w-full" />
          </Field>
          <Field label="العنوان الفرعي">
            <input value={banner.subtitleAr} onChange={e => onField('subtitleAr', e.target.value)} placeholder="تعرّف على أفضل معلمينا وطلابنا" className="field-light w-full" />
          </Field>
          <Field label="نص الزر (اختياري)">
            <input value={banner.buttonText} onChange={e => onField('buttonText', e.target.value)} placeholder="اكتشف المزيد" className="field-light w-full" />
          </Field>
          <Field label="رابط الزر (اختياري)">
            <input value={banner.buttonLink} onChange={e => onField('buttonLink', e.target.value)} placeholder="/about" className="field-light w-full" dir="ltr" />
          </Field>
        </div>
      </div>
    </div>
  )
}

// ── Live preview (compact) ────────────────────────────────────────────────────

function PreviewCard({ card }) {
  const url = getFileUrl(card.image)
  return (
    <div className="rounded-xl overflow-hidden flex-1 min-w-0" style={{ background: 'linear-gradient(160deg,#241342,#1a0c33)', opacity: card.isActive ? 1 : 0.4 }}>
      <div className="relative" style={{ height: 90, background: 'rgba(255,255,255,0.05)' }}>
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (
          <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>لا صورة</div>
        )}
        {card.badgeAr && (
          <div className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(232,199,106,0.9)', color: '#2a1500' }}>
            {card.badgeAr}
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="text-[11px] font-bold text-white truncate">{card.nameAr || '—'}</div>
        <div className="text-[9px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{card.titleAr || '—'}</div>
      </div>
    </div>
  )
}

function PreviewPanel({ form }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'radial-gradient(120% 130% at 30% 0%,#2a0e5e,#140530)' }}>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(232,199,106,0.8)' }}>معاينة مباشرة</div>
      {form.displayMode === 'cards' ? (
        <div className="flex gap-2">
          {form.cards.map(c => <PreviewCard key={c.role} card={c} />)}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden relative" style={{ height: 120, background: 'rgba(255,255,255,0.05)', opacity: form.banner.isActive ? 1 : 0.4 }}>
          {getFileUrl(form.banner.image) ? (
            <img src={getFileUrl(form.banner.image)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>لا صورة بانر</div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3" style={{ background: 'linear-gradient(to top, rgba(10,4,30,0.75), transparent 60%)' }}>
            <div className="text-xs font-bold text-white">{form.banner.titleAr || '—'}</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{form.banner.subtitleAr || ''}</div>
          </div>
        </div>
      )}
      {!form.isActive && (
        <div className="text-[10px] mt-2 text-center" style={{ color: '#f59e0b' }}>القسم معطّل حاليًا — لن يظهر في الصفحة الرئيسية</div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminSuccessStoriesPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'success-stories'],
    queryFn: () => api.get('/success-stories/admin').then(r => r.data.data),
  })

  useEffect(() => { if (data) setForm(data) }, [data])

  function updateCache(doc) {
    qc.setQueryData(['admin', 'success-stories'], doc)
    setForm(doc)
  }

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/success-stories/admin', payload).then(r => r.data.data),
    onSuccess: (doc) => { toast.success('تم الحفظ'); updateCache(doc) },
    onError: err => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const cardImageUpload = useMutation({
    mutationFn: ({ role, file }) => {
      const fd = new FormData()
      fd.append('image', file)
      return api.post(`/success-stories/admin/cards/${role}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data)
    },
    onSuccess: doc => { toast.success('تم رفع الصورة'); updateCache(doc) },
    onError: () => toast.error('فشل رفع الصورة'),
  })

  const cardImageRemove = useMutation({
    mutationFn: (role) => api.delete(`/success-stories/admin/cards/${role}/image`).then(r => r.data.data),
    onSuccess: doc => { toast.success('تم حذف الصورة'); updateCache(doc) },
  })

  const bannerImageUpload = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('image', file)
      return api.post('/success-stories/admin/banner/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data)
    },
    onSuccess: doc => { toast.success('تم رفع الصورة'); updateCache(doc) },
    onError: () => toast.error('فشل رفع الصورة'),
  })

  const bannerImageRemove = useMutation({
    mutationFn: () => api.delete('/success-stories/admin/banner/image').then(r => r.data.data),
    onSuccess: doc => { toast.success('تم حذف الصورة'); updateCache(doc) },
  })

  function setCardField(role, field, value) {
    setForm(f => ({ ...f, cards: f.cards.map(c => (c.role === role ? { ...c, [field]: value } : c)) }))
  }

  function setBannerField(field, value) {
    setForm(f => ({ ...f, banner: { ...f.banner, [field]: value } }))
  }

  function handleSave() {
    saveMutation.mutate({
      displayMode: form.displayMode,
      isActive: form.isActive,
      cards: form.cards.map(({ role, nameAr, titleAr, descriptionAr, badgeAr, ctaText, ctaLink, order, isActive }) => (
        { role, nameAr, titleAr, descriptionAr, badgeAr, ctaText, ctaLink, order, isActive }
      )),
      banner: {
        titleAr: form.banner.titleAr, subtitleAr: form.banner.subtitleAr,
        buttonText: form.banner.buttonText, buttonLink: form.banner.buttonLink,
        isActive: form.banner.isActive,
      },
    })
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner color="border-brand-purple" />
      </div>
    )
  }

  return (
    <div dir="rtl" className="max-w-[1200px] space-y-5">
      <PageHeader
        title="قصص النجاح"
        subtitle="إدارة قسم أفضل معلم / أفضل طالب / أفضل إنجاز في الصفحة الرئيسية"
        actions={(
          <>
            <Toggle checked={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} label="تفعيل القسم" />
            <Button variant="purple" onClick={handleSave} loading={saveMutation.isPending}>حفظ التغييرات</Button>
          </>
        )}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5 items-start">
        <div className="space-y-5">
          {/* Display mode selector */}
          <div className="card-light p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-[#9b7fd6] mb-3">طريقة العرض</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'cards', label: 'ثلاث بطاقات', desc: 'أفضل معلم / أفضل طالب / أفضل إنجاز كبطاقات منفصلة' },
                { key: 'banner', label: 'بانر واحد', desc: 'صورة واحدة كبيرة تجمع الثلاثة معًا' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setForm(f => ({ ...f, displayMode: opt.key }))}
                  className="text-right p-4 rounded-xl border transition-all"
                  style={{
                    borderColor: form.displayMode === opt.key ? '#7c3aed' : '#e8e0f5',
                    background: form.displayMode === opt.key ? 'rgba(124,58,237,0.06)' : '#fff',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex-none flex items-center justify-center"
                      style={{ borderColor: form.displayMode === opt.key ? '#7c3aed' : '#d1d5db' }}
                    >
                      {form.displayMode === opt.key && <div className="w-2 h-2 rounded-full" style={{ background: '#7c3aed' }} />}
                    </div>
                    <span className="font-semibold text-sm text-brand-textBody">{opt.label}</span>
                  </div>
                  <p className="text-xs text-[#9b7fd6]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {form.displayMode === 'cards' ? (
            <div className="space-y-4">
              {form.cards.map(card => (
                <CardEditor
                  key={card.role}
                  card={card}
                  onField={(field, value) => setCardField(card.role, field, value)}
                  onUploadImage={(file) => cardImageUpload.mutateAsync({ role: card.role, file })}
                  onRemoveImage={() => cardImageRemove.mutate(card.role)}
                />
              ))}
            </div>
          ) : (
            <BannerEditor
              banner={form.banner}
              onField={setBannerField}
              onUploadImage={(file) => bannerImageUpload.mutateAsync(file)}
              onRemoveImage={() => bannerImageRemove.mutate()}
            />
          )}
        </div>

        {/* Sidebar preview */}
        <div className="xl:sticky xl:top-20">
          <PreviewPanel form={form} />
        </div>
      </div>
    </div>
  )
}
