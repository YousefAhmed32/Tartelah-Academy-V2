import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Input from '../../components/ui/Input.jsx'
import Avatar from '../../components/ui/Avatar.jsx'

export default function AdminSettingsPage() {
  const { user, setAuth } = useAuthStore()
  const [form, setForm] = useState({ firstNameAr: user?.firstNameAr || '', lastNameAr: user?.lastNameAr || '', email: user?.email || '' })
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
    <div dir="rtl">
      <PageHeader title="الإعدادات" subtitle="إدارة حساب المدير" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-light p-6">
          <h2 className="font-heading font-bold text-brand-textBody text-lg mb-5">الملف الشخصي</h2>
          <div className="flex items-center gap-4 mb-6">
            <Avatar src={user?.avatar} name={`${user?.firstNameAr || ''} ${user?.lastNameAr || ''}`} size="lg" />
            <div>
              <div className="font-heading font-bold text-brand-textBody">{user?.firstNameAr} {user?.lastNameAr}</div>
              <div className="text-sm text-[#9b7fd6]">{user?.email}</div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="الاسم الأول" name="firstNameAr" value={form.firstNameAr} onChange={change} variant="light" />
              <Input label="اسم العائلة" name="lastNameAr" value={form.lastNameAr} onChange={change} variant="light" />
            </div>
            <Input label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={change} variant="light" />
            <Button variant="purple" onClick={() => profileMutation.mutate(form)} loading={profileMutation.isPending}>حفظ التغييرات</Button>
          </div>
        </div>

        <div className="card-light p-6">
          <h2 className="font-heading font-bold text-brand-textBody text-lg mb-5">تغيير كلمة المرور</h2>
          <form onSubmit={handlePw} className="space-y-4">
            <Input label="كلمة المرور الحالية" name="currentPassword" type="password" value={pwForm.currentPassword} onChange={changePw} variant="light" />
            <Input label="كلمة المرور الجديدة" name="newPassword" type="password" value={pwForm.newPassword} onChange={changePw} variant="light" />
            <Input label="تأكيد كلمة المرور" name="confirmPassword" type="password" value={pwForm.confirmPassword} onChange={changePw} variant="light" />
            <Button type="submit" variant="purple" loading={pwMutation.isPending}>تغيير كلمة المرور</Button>
          </form>
        </div>
      </div>
    </div>
  )
}
