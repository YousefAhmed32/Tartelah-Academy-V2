import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { User, Lock, Building2, Globe, Phone, Mail, MessageCircle, Video, Share2, Save } from 'lucide-react'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
          <Icon size={18} className="text-violet-600" />
        </div>
        <h2 className="font-heading font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, setAuth } = useAuthStore()
  const [form, setForm] = useState({ firstNameAr: user?.firstNameAr || '', lastNameAr: user?.lastNameAr || '', email: user?.email || '', phone: user?.phone || '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }
  function changePw(e) { setPwForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  const profileMut = useMutation({
    mutationFn: (data) => api.patch('/users/me', data).then(r => r.data),
    onSuccess: (res) => { setAuth(res.data, null); toast.success('تم تحديث الملف الشخصي') },
    onError: () => toast.error('حدث خطأ'),
  })

  const pwMut = useMutation({
    mutationFn: (data) => api.patch('/auth/change-password', data).then(r => r.data),
    onSuccess: () => { toast.success('تم تغيير كلمة المرور'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) },
    onError: () => toast.error('كلمة المرور الحالية غير صحيحة'),
  })

  function handlePw(e) {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('كلمتا المرور غير متطابقتين')
    pwMut.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Section title="الملف الشخصي" icon={User}>
        <div className="flex items-center gap-4 mb-6">
          <Avatar src={user?.avatar} firstName={user?.firstNameAr} lastName={user?.lastNameAr} size="lg" />
          <div>
            <div className="font-heading font-bold text-gray-900">{user?.firstNameAr} {user?.lastNameAr}</div>
            <div className="text-sm text-gray-500">{user?.email}</div>
            <div className="text-xs text-violet-600 font-semibold mt-0.5">مسؤول النظام</div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="الاسم الأول" name="firstNameAr" value={form.firstNameAr} onChange={change} variant="light" />
            <Input label="اسم العائلة" name="lastNameAr" value={form.lastNameAr} onChange={change} variant="light" />
          </div>
          <Input label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={change} variant="light" />
          <Input label="رقم الهاتف" name="phone" value={form.phone} onChange={change} variant="light" />
          <Button variant="purple" onClick={() => profileMut.mutate(form)} loading={profileMut.isPending}>حفظ التغييرات</Button>
        </div>
      </Section>

      <Section title="تغيير كلمة المرور" icon={Lock}>
        <form onSubmit={handlePw} className="space-y-4">
          <Input label="كلمة المرور الحالية" name="currentPassword" type="password" value={pwForm.currentPassword} onChange={changePw} variant="light" />
          <Input label="كلمة المرور الجديدة" name="newPassword" type="password" value={pwForm.newPassword} onChange={changePw} variant="light" />
          <Input label="تأكيد كلمة المرور" name="confirmPassword" type="password" value={pwForm.confirmPassword} onChange={changePw} variant="light" />
          <Button type="submit" variant="purple" loading={pwMut.isPending}>تغيير كلمة المرور</Button>
        </form>
      </Section>
    </div>
  )
}

// ── Academy Tab ───────────────────────────────────────────────────────────────

function AcademyTab() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['academy-settings'],
    queryFn: () => api.get('/website/settings').then(r => r.data?.data || {}),
    onError: () => {},
  })

  const [form, setForm] = useState({
    academyNameAr: '',
    academyNameEn: '',
    taglineAr: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
    zoomClientId: '',
    googleMeetEnabled: false,
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
  })

  // Fill form when data loads
  useState(() => {
    if (data) setForm(f => ({ ...f, ...data }))
  }, [data])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mut = useMutation({
    mutationFn: (data) => api.patch('/website/settings', data).then(r => r.data),
    onSuccess: () => {
      toast.success('تم حفظ إعدادات الأكاديمية')
      qc.invalidateQueries({ queryKey: ['academy-settings'] })
    },
    onError: () => toast.error('حدث خطأ أثناء الحفظ'),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner color="border-violet-600" /></div>

  return (
    <div className="space-y-6">
      {/* Academy Info */}
      <Section title="معلومات الأكاديمية" icon={Building2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">اسم الأكاديمية (عربي)</label>
            <input className={inputCls} value={form.academyNameAr} onChange={e => set('academyNameAr', e.target.value)} placeholder="ترتيلة للتعليم الإسلامي" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">اسم الأكاديمية (إنجليزي)</label>
            <input className={inputCls} value={form.academyNameEn} onChange={e => set('academyNameEn', e.target.value)} placeholder="Tartelah Academy" dir="ltr" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">الشعار الفرعي</label>
            <input className={inputCls} value={form.taglineAr} onChange={e => set('taglineAr', e.target.value)} placeholder="تعلم القرآن الكريم بأيسر الطرق..." />
          </div>
        </div>
      </Section>

      {/* Contact Info */}
      <Section title="معلومات التواصل" icon={Phone}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block flex items-center gap-1.5"><Phone size={12} /> رقم الهاتف</label>
            <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} dir="ltr" placeholder="+966..." />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block flex items-center gap-1.5"><MessageCircle size={12} /> واتساب</label>
            <input className={inputCls} value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} dir="ltr" placeholder="+966..." />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block flex items-center gap-1.5"><Mail size={12} /> البريد الإلكتروني</label>
            <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} dir="ltr" placeholder="info@tartelah.com" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block flex items-center gap-1.5"><Globe size={12} /> العنوان</label>
            <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="الرياض، المملكة العربية السعودية" />
          </div>
        </div>
      </Section>

      {/* Social Media */}
      <Section title="وسائل التواصل الاجتماعي" icon={Share2}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'facebook', label: 'Facebook', ph: 'https://facebook.com/...' },
            { key: 'instagram', label: 'Instagram', ph: 'https://instagram.com/...' },
            { key: 'twitter', label: 'X (Twitter)', ph: 'https://x.com/...' },
            { key: 'youtube', label: 'YouTube', ph: 'https://youtube.com/...' },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">{label}</label>
              <input className={inputCls} value={form[key]} onChange={e => set(key, e.target.value)} dir="ltr" placeholder={ph} />
            </div>
          ))}
        </div>
      </Section>

      {/* Integrations */}
      <Section title="التكاملات" icon={Video}>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Video size={16} className="text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Zoom Integration</div>
                  <div className="text-xs text-gray-500">متكامل مع اشتراكات المعلمين</div>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold">مفعّل</span>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">Zoom Client ID (اختياري)</label>
              <input className={inputCls} value={form.zoomClientId} onChange={e => set('zoomClientId', e.target.value)} dir="ltr" placeholder="Zoom OAuth Client ID" />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Video size={16} className="text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">Google Meet</div>
                  <div className="text-xs text-gray-500">السماح للمعلمين باستخدام Google Meet</div>
                </div>
              </div>
              <button onClick={() => set('googleMeetEnabled', !form.googleMeetEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.googleMeetEnabled ? 'bg-violet-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.googleMeetEnabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={() => mut.mutate(form)} disabled={mut.isPending}
          className="flex items-center gap-2 h-11 px-8 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-60">
          {mut.isPending ? <Spinner size="sm" color="border-white" /> : <Save size={16} />}
          حفظ جميع الإعدادات
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'profile', label: 'حسابي', icon: User },
  { key: 'academy', label: 'إعدادات الأكاديمية', icon: Building2 },
]

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div dir="rtl" className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="font-heading font-extrabold text-2xl text-gray-900">الإعدادات</h1>
        <p className="text-sm text-gray-500 mt-0.5">إدارة حسابك وإعدادات المنصة</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-[10px] text-sm font-bold transition-all ${activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'academy' && <AcademyTab />}
    </div>
  )
}
