import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save, Star } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

const sections = [
  { key: 'testimonials',    label: 'آراء الطلاب' },
  { key: 'faqs',           label: 'الأسئلة الشائعة' },
  { key: 'website_settings', label: 'إعدادات التواصل والفوتر' },
]

function SettingsForm({ settings, onSave, isPending }) {
  const [form, setForm] = useState({
    phone: '', whatsapp: '', email: '', youtube: '', instagram: '', facebook: '', twitter: '', linkedin: '',
    workingHours: '', supportText: '', emergencyContact: '', googleMapsUrl: '', googleMapsEmbed: '',
    footerDescription: '', footerCopyright: '', newsletterEnabled: true, newsletterText: '',
    privacyPolicyUrl: '', termsUrl: '', cookiesPolicyUrl: '',
  })

  useEffect(() => {
    if (settings) setForm(prev => ({ ...prev, ...settings }))
  }, [settings])

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  function Section({ title, children }) {
    return (
      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-widest text-[#9b7fd6] mb-3 pb-2 border-b border-[#ede9fe]">{title}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
      </div>
    )
  }

  function Field({ label, children }) {
    return (
      <div>
        <label className="block text-xs font-semibold text-[#374151] mb-1.5">{label}</label>
        {children}
      </div>
    )
  }

  return (
    <div>
      <Section title="معلومات التواصل">
        <Field label="البريد الإلكتروني">
          <input value={form.email} onChange={f('email')} className="field-light w-full" placeholder="tartela.online@gmail.com" dir="ltr" />
        </Field>
        <Field label="رقم الهاتف">
          <input value={form.phone} onChange={f('phone')} className="field-light w-full" placeholder="+20 105 040 0096" dir="ltr" />
        </Field>
        <Field label="واتساب (رقم بدون +)">
          <input value={form.whatsapp} onChange={f('whatsapp')} className="field-light w-full" placeholder="966567443805" dir="ltr" />
        </Field>
        <Field label="يوتيوب">
          <input value={form.youtube} onChange={f('youtube')} className="field-light w-full" placeholder="@tartela.2online" dir="ltr" />
        </Field>
        <Field label="إنستغرام">
          <input value={form.instagram} onChange={f('instagram')} className="field-light w-full" placeholder="https://instagram.com/..." dir="ltr" />
        </Field>
        <Field label="فيسبوك">
          <input value={form.facebook} onChange={f('facebook')} className="field-light w-full" placeholder="https://facebook.com/..." dir="ltr" />
        </Field>
      </Section>

      <Section title="ساعات العمل والدعم">
        <Field label="ساعات العمل">
          <input value={form.workingHours} onChange={f('workingHours')} className="field-light w-full" placeholder="السبت – الخميس: 9:00 ص – 9:00 م" />
        </Field>
        <Field label="نص الدعم (يظهر في صفحة التواصل)">
          <input value={form.supportText} onChange={f('supportText')} className="field-light w-full" placeholder="فريقنا مستعد لمساعدتك..." />
        </Field>
        <Field label="جهة اتصال الطوارئ">
          <input value={form.emergencyContact} onChange={f('emergencyContact')} className="field-light w-full" placeholder="+966 XX XXX XXXX" dir="ltr" />
        </Field>
        <Field label="رابط Google Maps">
          <input value={form.googleMapsUrl} onChange={f('googleMapsUrl')} className="field-light w-full" placeholder="https://maps.google.com/..." dir="ltr" />
        </Field>
        <div className="md:col-span-2">
          <Field label="رابط تضمين خريطة Google (iframe src)">
            <input value={form.googleMapsEmbed} onChange={f('googleMapsEmbed')} className="field-light w-full" placeholder="https://www.google.com/maps/embed?pb=..." dir="ltr" />
          </Field>
        </div>
      </Section>

      <Section title="إعدادات الفوتر">
        <div className="md:col-span-2">
          <Field label="وصف الفوتر">
            <textarea value={form.footerDescription} onChange={f('footerDescription')} rows={2} className="field-light resize-none w-full" placeholder="منصة ترتيلة أونلاين — وجهتك الأولى لتعلم القرآن الكريم..." />
          </Field>
        </div>
        <Field label="نص حقوق النشر">
          <input value={form.footerCopyright} onChange={f('footerCopyright')} className="field-light w-full" placeholder="© 2026 ترتيلة أونلاين — جميع الحقوق محفوظة" />
        </Field>
        <Field label="رابط سياسة الخصوصية">
          <input value={form.privacyPolicyUrl} onChange={f('privacyPolicyUrl')} className="field-light w-full" placeholder="/privacy" dir="ltr" />
        </Field>
        <Field label="رابط شروط الاستخدام">
          <input value={form.termsUrl} onChange={f('termsUrl')} className="field-light w-full" placeholder="/terms" dir="ltr" />
        </Field>
        <Field label="رابط سياسة الكوكيز">
          <input value={form.cookiesPolicyUrl} onChange={f('cookiesPolicyUrl')} className="field-light w-full" placeholder="/cookies" dir="ltr" />
        </Field>
      </Section>

      <div className="mb-6">
        <div className="text-xs font-bold uppercase tracking-widest text-[#9b7fd6] mb-3 pb-2 border-b border-[#ede9fe]">النشرة البريدية</div>
        <div className="flex items-center gap-3 mb-3">
          <input type="checkbox" id="newsletter-enabled" checked={form.newsletterEnabled} onChange={f('newsletterEnabled')} className="w-4 h-4 accent-violet-600" />
          <label htmlFor="newsletter-enabled" className="text-sm font-semibold text-[#374151]">تفعيل قسم النشرة البريدية في الفوتر</label>
        </div>
        <input value={form.newsletterText} onChange={f('newsletterText')} className="field-light w-full" placeholder="اشترك للحصول على أحدث المقالات والدروس..." />
      </div>

      <div className="flex justify-end">
        <Button variant="purple" onClick={() => onSave(form)} loading={isPending}>
          <Save size={16} strokeWidth={2} className="inline-block ml-1.5" /> حفظ الإعدادات
        </Button>
      </div>
    </div>
  )
}

export default function AdminWebsitePage() {
  const [activeSection, setActiveSection] = useState('testimonials')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ nameAr: '', bodyAr: '', rating: 5, questionAr: '', answerAr: '' })
  const qc = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'website', activeSection],
    queryFn: () => api.get(`/website/${activeSection}`).then(r => r.data.data),
    enabled: activeSection !== 'website_settings',
  })

  const { data: settings } = useQuery({
    queryKey: ['admin', 'website', 'website_settings'],
    queryFn: () => api.get('/website/settings').then(r => r.data.data),
    enabled: activeSection === 'website_settings',
    placeholderData: {},
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/website/${activeSection}`, data),
    onSuccess: () => { toast.success('تم الإضافة بنجاح'); qc.invalidateQueries({ queryKey: ['admin', 'website', activeSection] }); setShowCreate(false) },
    onError: () => toast.error('حدث خطأ'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/website/${activeSection}/${id}`),
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['admin', 'website', activeSection] }) },
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => api.patch('/website/settings', data),
    onSuccess: () => { toast.success('تم حفظ الإعدادات'); qc.invalidateQueries({ queryKey: ['admin', 'website', 'website_settings'] }); qc.invalidateQueries({ queryKey: ['public', 'settings'] }) },
    onError: () => toast.error('حدث خطأ في حفظ الإعدادات'),
  })

  return (
    <div dir="rtl">
      <PageHeader title="إعدادات الموقع" subtitle="إدارة محتوى الصفحة الرئيسية والتواصل" />

      <div className="flex gap-1 mb-6 p-1 bg-[#f0ecf8] rounded-xl w-fit flex-wrap">
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`px-5 py-2 rounded-[10px] text-sm font-semibold transition-all ${activeSection === s.key ? 'bg-white text-brand-textBody shadow-sm' : 'text-[#9b7fd6] hover:text-brand-textBody'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'testimonials' && (
        <>
          <div className="flex justify-end mb-4">
            <Button variant="purple" size="sm" onClick={() => setShowCreate(true)}>+ إضافة شهادة</Button>
          </div>
          {isLoading ? <Spinner color="border-brand-purple" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((t) => (
                <div key={t._id} className="card-light p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-brand-textBody">{t.nameAr}</div>
                    <button onClick={() => deleteMutation.mutate(t._id)} className="text-red-400 text-xs hover:text-red-600">حذف</button>
                  </div>
                  <p className="text-sm text-[#9b7fd6]">{t.bodyAr}</p>
                  <div className="flex gap-0.5 mt-2">
                    {Array.from({ length: t.rating || 5 }).map((_, i) => (
                      <Star key={i} size={14} strokeWidth={0} fill="#E8C76A" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeSection === 'faqs' && (
        <>
          <div className="flex justify-end mb-4">
            <Button variant="purple" size="sm" onClick={() => setShowCreate(true)}>+ إضافة سؤال</Button>
          </div>
          {isLoading ? <Spinner color="border-brand-purple" /> : (
            <div className="space-y-3">
              {items.map((f) => (
                <div key={f._id} className="card-light p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-brand-textBody mb-2">{f.questionAr}</div>
                      <p className="text-sm text-[#9b7fd6]">{f.answerAr}</p>
                    </div>
                    <button onClick={() => deleteMutation.mutate(f._id)} className="text-red-400 text-xs hover:text-red-600 flex-none">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeSection === 'website_settings' && (
        <div className="card-light p-6">
          <SettingsForm
            settings={settings}
            onSave={(data) => updateSettingsMutation.mutate(data)}
            isPending={updateSettingsMutation.isPending}
          />
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={activeSection === 'testimonials' ? 'إضافة شهادة' : 'إضافة سؤال'} size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button variant="purple" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>إضافة</Button>
        </>}
      >
        <div className="space-y-4">
          {activeSection === 'testimonials' ? (
            <>
              <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الاسم</label><input value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} className="field-light w-full" /></div>
              <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الشهادة</label><textarea value={form.bodyAr} onChange={e => setForm(p => ({ ...p, bodyAr: e.target.value }))} rows={3} className="field-light resize-none w-full" /></div>
              <div><label className="block text-xs font-semibold text-brand-textBody mb-1">التقييم (١-٥)</label><input type="number" min="1" max="5" value={form.rating} onChange={e => setForm(p => ({ ...p, rating: Number(e.target.value) }))} className="field-light w-full" /></div>
            </>
          ) : (
            <>
              <div><label className="block text-xs font-semibold text-brand-textBody mb-1">السؤال</label><input value={form.questionAr} onChange={e => setForm(p => ({ ...p, questionAr: e.target.value }))} className="field-light w-full" /></div>
              <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الإجابة</label><textarea value={form.answerAr} onChange={e => setForm(p => ({ ...p, answerAr: e.target.value }))} rows={4} className="field-light resize-none w-full" /></div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
