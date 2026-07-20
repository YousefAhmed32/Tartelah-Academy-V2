import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'

// Defined at module scope (not inside SettingsForm) so their identity stays
// stable across renders — declaring them inside the form component made React
// remount the whole subtree (including every <input>) on each keystroke,
// which is what caused focus to drop after a single character.
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

function SettingsForm({ settings, onSave, isPending }) {
  const [form, setForm] = useState({
    phone: '', whatsapp: '', email: '', youtube: '', instagram: '', facebook: '', twitter: '', linkedin: '',
    workingHours: '', supportText: '', emergencyContact: '', googleMapsEmbed: '',
    footerDescription: '', footerCopyright: '', newsletterEnabled: true, newsletterText: '',
    privacyPolicyUrl: '', termsUrl: '', cookiesPolicyUrl: '',
  })

  useEffect(() => {
    if (settings) setForm(prev => ({ ...prev, ...settings }))
  }, [settings])

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

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
        <div className="md:col-span-2">
          <Field label="تضمين خريطة Google — الصق كود الـ iframe الكامل من Google Maps أو رابط src مباشرة">
            <input value={form.googleMapsEmbed} onChange={f('googleMapsEmbed')} className="field-light w-full" placeholder='<iframe src="https://www.google.com/maps/embed?pb=..."></iframe>' dir="ltr" />
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
  const qc = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ['admin', 'website', 'website_settings'],
    queryFn: () => api.get('/website/settings').then(r => r.data.data),
    placeholderData: {},
  })

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => api.patch('/website/settings', data),
    onSuccess: () => { toast.success('تم حفظ الإعدادات'); qc.invalidateQueries({ queryKey: ['admin', 'website', 'website_settings'] }); qc.invalidateQueries({ queryKey: ['public', 'settings'] }) },
    onError: () => toast.error('حدث خطأ في حفظ الإعدادات'),
  })

  return (
    <div dir="rtl">
      <PageHeader title="إعدادات الموقع" subtitle="إدارة إعدادات التواصل والفوتر" />

      <div className="card-light p-6">
        <SettingsForm
          settings={settings}
          onSave={(data) => updateSettingsMutation.mutate(data)}
          isPending={updateSettingsMutation.isPending}
        />
      </div>
    </div>
  )
}
