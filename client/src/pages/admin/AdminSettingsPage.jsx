import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { User, Lock, Building2, Globe, Phone, Mail, MessageCircle, Video, Share2, Save, Heart, GraduationCap, Archive, ArchiveRestore, Plus, Loader2, GripVertical, ArrowUpDown } from 'lucide-react'
import { motion, Reorder } from 'framer-motion'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import ImageUploadField from '../../components/ui/ImageUploadField.jsx'
import { getFileUrl } from '../../config/constants.js'
import {
  useAdminTeachingSubjects, useCreateTeachingSubject, useArchiveTeachingSubject, useUnarchiveTeachingSubject,
  useReorderTeachingSubjects,
} from '../../hooks/useTeachingSubjects.js'
import { credentialDefaultsService } from '../../services/credentialDefaults.service.js'

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
          <Avatar src={getFileUrl(user?.avatar)} firstName={user?.firstNameAr} lastName={user?.lastNameAr} size="lg" />
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
    logoId: '',
    academyNameAr: '',
    academyNameEn: '',
    taglineAr: '',
    missionQuoteAr: '',
    visionAr: '',
    aboutHeadlineAr: '',
    aboutBodyAr: '',
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
  useEffect(() => {
    if (data) setForm(f => ({ ...f, ...data }))
  }, [data])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const logoMut = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('logo', file)
      return api.post('/website/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
    },
    onSuccess: (res) => {
      set('logoId', res.data.logoId)
      toast.success('تم رفع الشعار')
      qc.invalidateQueries({ queryKey: ['academy-settings'] })
    },
    onError: () => toast.error('تعذّر رفع الشعار'),
  })

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
        <div className="mb-5 max-w-xs">
          <ImageUploadField
            label="شعار الأكاديمية"
            currentUrl={form.logoId}
            aspect={1}
            recommendedSizeText="مربع، 512×512 بكسل يفضّل"
            onUpload={(file) => logoMut.mutateAsync(file)}
          />
        </div>
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

      {/* Mission / Vision / About — public "من نحن" content shown on the About page */}
      <Section title="الرسالة والرؤية ومن نحن" icon={Heart}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">رسالتنا</label>
            <textarea className={`${inputCls} h-20 py-2 resize-y`} value={form.missionQuoteAr} onChange={e => set('missionQuoteAr', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">رؤيتنا</label>
            <textarea className={`${inputCls} h-20 py-2 resize-y`} value={form.visionAr} onChange={e => set('visionAr', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">عنوان &quot;من نحن&quot;</label>
            <input className={inputCls} value={form.aboutHeadlineAr} onChange={e => set('aboutHeadlineAr', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">نص &quot;من نحن&quot;</label>
            <textarea className={`${inputCls} h-32 py-2 resize-y`} value={form.aboutBodyAr} onChange={e => set('aboutBodyAr', e.target.value)} />
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

// ── Teaching Curricula Tab ────────────────────────────────────────────────────
// Admin management screen for the dynamic teaching-subject/curriculum
// catalog (server/src/services/teachingSubject.service.js). The primary
// creation flow is the inline creatable combobox used across every
// teacher/student/assignment form (components/ui/TeachingSubjectCombobox.jsx)
// — this screen is for reviewing the full catalog and archiving subjects
// that are no longer in use.
function CurriculaTab() {
  const { hasPermission } = useAuthStore()
  const canManage = hasPermission('curricula.manage')
  const { data: subjects = [], isLoading } = useAdminTeachingSubjects()
  const createMutation = useCreateTeachingSubject()
  const archiveMutation = useArchiveTeachingSubject()
  const unarchiveMutation = useUnarchiveTeachingSubject()
  const reorderMutation = useReorderTeachingSubjects()
  const [items, setItems] = useState([])
  const [newNameAr, setNewNameAr] = useState('')
  const [newNameEn, setNewNameEn] = useState('')
  const [pendingId, setPendingId] = useState(null)

  useEffect(() => {
    if (subjects?.length) {
      setItems(subjects)
    }
  }, [subjects])

  async function handleCreate() {
    const trimmed = newNameAr.trim()
    if (!trimmed || createMutation.isPending) return
    try {
      const res = await createMutation.mutateAsync({ nameAr: trimmed, nameEn: newNameEn.trim() || undefined })
      toast.success(res.message || 'تم إنشاء المنهج')
      setNewNameAr(''); setNewNameEn('')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'تعذّر إنشاء المنهج')
    }
  }

  async function toggleArchive(subject) {
    setPendingId(subject._id)
    try {
      if (subject.isActive) {
        await archiveMutation.mutateAsync(subject._id)
        toast.success('تمت أرشفة المنهج')
      } else {
        await unarchiveMutation.mutateAsync(subject._id)
        toast.success('تمت إعادة تفعيل المنهج')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'حدث خطأ')
    } finally {
      setPendingId(null)
    }
  }

  function handleReorder(newOrder) {
    setItems(newOrder)
    const orderedIds = newOrder.map((s) => s._id)
    reorderMutation.mutate(orderedIds, {
      onSuccess: () => toast.success('تم حفظ الترتيب الجديد بنجاح'),
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'فشل حفظ الترتيب')
        setItems(subjects)
      },
    })
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <Section title="إضافة منهج جديد" icon={Plus}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">الاسم بالعربية *</label>
              <input className={inputCls} value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
                placeholder="مثال: الرياضيات" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">الاسم بالإنجليزية (اختياري)</label>
              <input className={inputCls} value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} placeholder="Mathematics" dir="ltr" />
            </div>
          </div>
          <Button variant="purple" className="mt-3" loading={createMutation.isPending} disabled={!newNameAr.trim()} onClick={handleCreate} size="sm">
            <Plus size={15} /> إضافة المنهج
          </Button>
        </Section>
      )}

      <Section title="كل المناهج التعليمية" icon={GraduationCap}>
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner color="border-brand-purple" /></div>
        ) : !items.length ? (
          <p className="text-sm text-gray-400 text-center py-6">لا توجد مناهج بعد</p>
        ) : (
          <div className="space-y-3">
            {canManage && items.length > 1 && (
              <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50/70 border border-violet-100 rounded-xl p-2.5">
                <ArrowUpDown size={14} className="flex-none" />
                <span>ميزة السحب والإفلات مُفعلة: يمكنك الإمساك بأي منهج وسحبه للأعلى أو الأسفل لإعادة ترتيب ظهوره عبر النظام.</span>
              </div>
            )}
            <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-2">
              {items.map((s) => (
                <Reorder.Item
                  key={s._id}
                  value={s}
                  dragListener={canManage}
                  whileDrag={{ scale: 1.02, boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.15)', zIndex: 30 }}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border select-none transition-shadow ${
                    s.isActive ? 'border-gray-100 bg-white shadow-sm' : 'border-gray-100 bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {canManage && (
                      <div
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-violet-600 p-1.5 rounded-lg hover:bg-violet-50 transition-colors flex-none"
                        title="اسحب لإعادة الترتيب"
                      >
                        <GripVertical size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className={`font-bold text-sm truncate ${s.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                        {s.nameAr}{s.nameEn ? ` (${s.nameEn})` : ''}
                        {s.isSystem && <span className="ms-2 text-[10px] font-bold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">أساسي</span>}
                      </div>
                      <div className={`text-[11px] mt-0.5 ${s.isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {s.isActive ? 'نشط' : 'مؤرشف'}
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => toggleArchive(s)}
                      disabled={pendingId === s._id}
                      className={`flex-none min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-colors ${
                        s.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {pendingId === s._id ? <Loader2 size={14} className="animate-spin" /> : (s.isActive ? <Archive size={14} /> : <ArchiveRestore size={14} />)}
                      {s.isActive ? 'أرشفة' : 'إعادة تفعيل'}
                    </button>
                  )}
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Credential Defaults Tab (Phase 2 meeting addendum §1) ──────────────────────
// Manages the academy-wide default student/teacher passwords. Never displays
// the stored password after saving — only whether one is configured, and who/
// when it was last replaced. Gated end-to-end by 'credentials.manage_defaults'
// (route-level on the backend; tab visibility here is convenience only).

function CredentialDefaultRow({ role, label, status, cryptoConfigured }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [pw, setPw] = useState({ password: '', passwordConfirm: '' })

  const saveMut = useMutation({
    mutationFn: () => credentialDefaultsService.setDefault(role, pw.password, pw.passwordConfirm).then(r => r.data),
    onSuccess: () => {
      toast.success('تم حفظ كلمة المرور الافتراضية')
      qc.invalidateQueries({ queryKey: ['credentialDefaults'] })
      setEditing(false)
      setPw({ password: '', passwordConfirm: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const clearMut = useMutation({
    mutationFn: () => credentialDefaultsService.clearDefault(role).then(r => r.data),
    onSuccess: () => { toast.success('تم إلغاء التفعيل'); qc.invalidateQueries({ queryKey: ['credentialDefaults'] }) },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <div className="rounded-xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-bold text-gray-800 text-sm">{label}</div>
          {status?.configured ? (
            <div className="text-xs text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> مُفعّلة
              {status.updatedAt && <span className="text-gray-400 font-normal">— آخر تحديث {new Date(status.updatedAt).toLocaleDateString('ar-EG')}</span>}
            </div>
          ) : (
            <div className="text-xs text-gray-400 font-semibold mt-0.5">غير مُفعّلة — لن يظهر خيار "كلمة مرور الأكاديمية" لهذا الدور</div>
          )}
        </div>
        <div className="flex gap-2">
          {status?.configured && (
            <Button variant="ghost" size="sm" onClick={() => clearMut.mutate()} loading={clearMut.isPending}>إلغاء التفعيل</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>{status?.configured ? 'استبدال' : 'إعداد'}</Button>
        </div>
      </div>

      {editing && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <p className="text-[11px] text-amber-600 font-semibold">
            هذا التغيير يسري فقط على الحسابات التي تُنشأ بعد الحفظ — لن يتأثر أي حساب موجود حاليًا.
          </p>
          <Input label="كلمة المرور الافتراضية الجديدة" type="password" variant="light"
            value={pw.password} onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))} autoComplete="new-password" />
          <Input label="تأكيد كلمة المرور" type="password" variant="light"
            value={pw.passwordConfirm} onChange={(e) => setPw((p) => ({ ...p, passwordConfirm: e.target.value }))} autoComplete="new-password" />
          <Button variant="purple" size="sm" onClick={() => saveMut.mutate()} loading={saveMut.isPending} disabled={!cryptoConfigured}>حفظ</Button>
        </div>
      )}
    </div>
  )
}

function CredentialDefaultsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['credentialDefaults', 'status'],
    queryFn: () => credentialDefaultsService.getStatus().then(r => r.data.data),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <Section title="كلمات المرور الافتراضية للأكاديمية" icon={Lock}>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          كلمة مرور تشغيلية مشتركة تُستخدم كخيار عند إنشاء حسابات الطلاب أو المعلمين الجدد، بدلًا من كتابة كلمة مرور يدويًا أو توليد كلمة عشوائية لكل حساب.
          لا تُعرض كلمة المرور المخزّنة أبدًا بعد حفظها — فقط حالة التفعيل. كل حساب يحصل على كلمة مرور مُشفّرة (hash) خاصة به رغم استخدام نفس النص الأصلي.
        </p>
        {!data?.cryptoConfigured && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 font-semibold">
            لم يتم إعداد مفتاح التشفير (CREDENTIAL_DEFAULTS_KEY) على الخادم — لا يمكن حفظ كلمات مرور افتراضية حتى يُضاف هذا المتغير البيئي.
          </div>
        )}
        <div className="space-y-3">
          <CredentialDefaultRow role="student" label="كلمة مرور الطلاب الافتراضية" status={data?.student} cryptoConfigured={data?.cryptoConfigured} />
          <CredentialDefaultRow role="teacher" label="كلمة مرور المعلمين الافتراضية" status={data?.teacher} cryptoConfigured={data?.cryptoConfigured} />
        </div>
      </Section>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const ALL_TABS = [
  { key: 'profile', label: 'حسابي', icon: User },
  { key: 'academy', label: 'إعدادات الأكاديمية', icon: Building2 },
  { key: 'curricula', label: 'المناهج التعليمية', icon: GraduationCap, permission: 'curricula.view' },
  { key: 'credentials', label: 'كلمات المرور الافتراضية', icon: Lock, permission: 'credentials.manage_defaults' },
]

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { hasPermission } = useAuthStore()
  const TABS = ALL_TABS.filter((t) => !t.permission || hasPermission(t.permission))

  return (
    <div dir="rtl" className="space-y-6 max-w-[1100px]">
      <div>
        <h1 className="font-heading font-extrabold text-2xl text-gray-900">الإعدادات</h1>
        <p className="text-sm text-gray-500 mt-0.5">إدارة حسابك وإعدادات المنصة</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2 rounded-[10px] text-sm font-bold transition-all ${activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'academy' && <AcademyTab />}
      {activeTab === 'curricula' && <CurriculaTab />}
      {activeTab === 'credentials' && <CredentialDefaultsTab />}
    </div>
  )
}
