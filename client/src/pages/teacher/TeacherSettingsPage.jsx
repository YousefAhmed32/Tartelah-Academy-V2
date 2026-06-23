import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Avatar from '../../components/ui/Avatar.jsx'

export default function TeacherSettingsPage() {
  const { user, setAuth } = useAuthStore()
  const [form, setForm] = useState({
    firstNameAr: user?.firstNameAr || '',
    lastNameAr: user?.lastNameAr || '',
    phone: user?.phone || '',
    bioAr: user?.bioAr || '',
    specialization: user?.specialization || '',
  })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }
  function changePw(e) { setPwForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  const profileMutation = useMutation({
    mutationFn: (data) => api.patch('/users/me', data),
    onSuccess: (res) => { setAuth(res.data.data, null); toast.success('تم تحديث الملف الشخصي') },
    onError: () => toast.error('حدث خطأ'),
  })

  const pwMutation = useMutation({
    mutationFn: (data) => api.patch('/auth/change-password', data),
    onSuccess: () => { toast.success('تم تغيير كلمة المرور'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) },
    onError: () => toast.error('كلمة المرور الحالية غير صحيحة'),
  })

  function handlePw(e) {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('كلمتا المرور غير متطابقتين')
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
  }

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="إدارة حسابك الشخصي" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-card p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-heading font-bold text-white text-lg mb-5">الملف الشخصي</h2>
          <div className="flex items-center gap-4 mb-6">
            <Avatar src={user?.avatar} name={`${user?.firstNameAr || ''} ${user?.lastNameAr || ''}`} size="lg" ring />
            <div>
              <div className="text-white font-bold">{user?.firstNameAr} {user?.lastNameAr}</div>
              <div className="text-sm" style={{ color: '#b3a4d0' }}>{user?.email}</div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-white mb-1">الاسم الأول</label><input name="firstNameAr" value={form.firstNameAr} onChange={change} className="field w-full" /></div>
              <div><label className="block text-xs font-semibold text-white mb-1">اسم العائلة</label><input name="lastNameAr" value={form.lastNameAr} onChange={change} className="field w-full" /></div>
            </div>
            <div><label className="block text-xs font-semibold text-white mb-1">رقم الهاتف</label><input name="phone" value={form.phone} onChange={change} className="field w-full" /></div>
            <div><label className="block text-xs font-semibold text-white mb-1">التخصص</label><input name="specialization" value={form.specialization} onChange={change} className="field w-full" placeholder="مثال: حفظ القرآن والتجويد" /></div>
            <div><label className="block text-xs font-semibold text-white mb-1">نبذة شخصية</label><textarea name="bioAr" value={form.bioAr} onChange={change} rows={3} className="field resize-none w-full" /></div>
            <Button variant="gold" onClick={() => profileMutation.mutate(form)} loading={profileMutation.isPending}>حفظ التغييرات</Button>
          </div>
        </div>

        <div className="rounded-card p-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-heading font-bold text-white text-lg mb-5">تغيير كلمة المرور</h2>
          <form onSubmit={handlePw} className="space-y-4">
            {[['currentPassword', 'كلمة المرور الحالية'], ['newPassword', 'كلمة المرور الجديدة'], ['confirmPassword', 'تأكيد كلمة المرور']].map(([name, label]) => (
              <div key={name}><label className="block text-xs font-semibold text-white mb-1">{label}</label><input type="password" name={name} value={pwForm[name]} onChange={changePw} className="field w-full" /></div>
            ))}
            <Button type="submit" variant="gold" loading={pwMutation.isPending}>تغيير كلمة المرور</Button>
          </form>
        </div>
      </div>
    </div>
  )
}
