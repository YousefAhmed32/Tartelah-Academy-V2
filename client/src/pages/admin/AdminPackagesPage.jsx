import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatCurrency } from '../../utils/format.js'

const initialForm = { nameAr: '', name: '', descriptionAr: '', price: '', durationDays: 30, sessionsPerMonth: 8, featuresAr: '' }

export default function AdminPackagesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(initialForm)
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
    onSuccess: () => { toast.success('تم إنشاء الباقة'); qc.invalidateQueries({ queryKey: ['packages'] }); setShowCreate(false); setForm(initialForm) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/packages/${id}`, { isActive }),
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries({ queryKey: ['packages'] }) },
  })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  return (
    <div dir="rtl">
      <PageHeader
        title="الباقات والأسعار"
        subtitle={`${packages.length} باقة`}
        actions={<Button variant="purple" onClick={() => setShowCreate(true)}>+ باقة جديدة</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div key={pkg._id} className={`card-light p-6 relative ${pkg.isPopular ? 'ring-2 ring-brand-purple' : ''}`}>
              {pkg.isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-purple text-white text-xs font-bold px-4 py-1 rounded-full">الأكثر شيوعاً</div>}
              <div className="flex items-start justify-between mb-3">
                <div className="font-heading font-extrabold text-brand-textBody text-xl">{pkg.nameAr}</div>
                <Badge variant={pkg.isActive ? 'success' : 'gray'}>{pkg.isActive ? 'نشط' : 'موقوف'}</Badge>
              </div>
              <div className="font-heading font-extrabold text-3xl text-brand-purple mb-1">
                {formatCurrency(pkg.price)}<span className="text-sm font-normal text-[#9b7fd6]"> ريال</span>
              </div>
              <div className="text-xs text-[#9b7fd6] mb-4">{pkg.durationDays} يوم • {pkg.sessionsPerMonth} حصة/شهر</div>
              {pkg.featuresAr?.length > 0 && (
                <ul className="space-y-1.5 mb-5">
                  {pkg.featuresAr.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-brand-textBody">
                      <span className="text-emerald-500">✓</span>{f}
                    </li>
                  ))}
                </ul>
              )}
              <button onClick={() => toggleMutation.mutate({ id: pkg._id, isActive: !pkg.isActive })} className="text-xs font-semibold text-brand-purple hover:text-brand-purpleDark">
                {pkg.isActive ? 'إيقاف تفعيل' : 'تفعيل الباقة'}
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إضافة باقة جديدة" size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button variant="purple" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>إنشاء</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الاسم بالعربية</label><input name="nameAr" value={form.nameAr} onChange={change} className="field-light w-full" /></div>
            <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الاسم بالإنجليزية</label><input name="name" value={form.name} onChange={change} className="field-light w-full" /></div>
          </div>
          <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الوصف</label><input name="descriptionAr" value={form.descriptionAr} onChange={change} className="field-light w-full" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-semibold text-brand-textBody mb-1">السعر (ريال)</label><input type="number" name="price" value={form.price} onChange={change} className="field-light w-full" /></div>
            <div><label className="block text-xs font-semibold text-brand-textBody mb-1">المدة (يوم)</label><input type="number" name="durationDays" value={form.durationDays} onChange={change} className="field-light w-full" /></div>
            <div><label className="block text-xs font-semibold text-brand-textBody mb-1">حصص/شهر</label><input type="number" name="sessionsPerMonth" value={form.sessionsPerMonth} onChange={change} className="field-light w-full" /></div>
          </div>
          <div><label className="block text-xs font-semibold text-brand-textBody mb-1">المميزات (سطر واحد لكل ميزة)</label><textarea name="featuresAr" value={form.featuresAr} onChange={change} rows={4} className="field-light resize-none w-full" placeholder="حصص مباشرة مع معلم خاص&#10;متابعة دورية&#10;تقييمات شهرية" /></div>
        </div>
      </Modal>
    </div>
  )
}
