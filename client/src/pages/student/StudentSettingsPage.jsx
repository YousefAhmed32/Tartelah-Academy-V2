import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { getFileUrl } from '../../config/constants.js'

export default function StudentSettingsPage() {
  const { user, setAuth } = useAuthStore()
  const [form, setForm] = useState({
    firstNameAr: user?.firstNameAr || '',
    lastNameAr: user?.lastNameAr || '',
    phone: user?.phone || '',
  })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  function change(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })) }
  function changePw(e) { setPwForm(p => ({ ...p, [e.target.name]: e.target.value })) }

  const profileMutation = useMutation({
    mutationFn: (data) => api.patch('/users/me', data),
    onSuccess: (res) => {
      setAuth(res.data.data, null)
      toast.success('تم تحديث الملف الشخصي')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const pwMutation = useMutation({
    mutationFn: (data) => api.patch('/auth/change-password', data),
    onSuccess: () => {
      toast.success('تم تغيير كلمة المرور')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'كلمة المرور الحالية غير صحيحة'),
  })

  function handleProfile(e) {
    e.preventDefault()
    profileMutation.mutate(form)
  }

  function handlePw(e) {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('كلمتا المرور غير متطابقتين')
    if (pwForm.newPassword.length < 8) return toast.error('كلمة المرور قصيرة جداً')
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
  }

  return (
    <div dir="rtl">
      <PageHeader title="الإعدادات" subtitle="إدارة حسابك وإعداداتك الشخصية" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="card-light p-6">
          <h2 className="font-heading font-bold text-brand-textBody text-lg mb-5">الملف الشخصي</h2>
          <div className="flex items-center gap-4 mb-6">
            <Avatar
              src={getFileUrl(user?.avatar)}
              firstName={user?.firstNameAr}
              lastName={user?.lastNameAr}
              size="lg"
            />
            <div>
              <div className="font-heading font-bold text-brand-textBody">{user?.firstNameAr} {user?.lastNameAr}</div>
              <div className="text-sm text-[#9b7fd6]">{user?.email}</div>
            </div>
          </div>
          <form onSubmit={handleProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="الاسم الأول" name="firstNameAr" value={form.firstNameAr} onChange={change} variant="light" />
              <Input label="اسم العائلة" name="lastNameAr" value={form.lastNameAr} onChange={change} variant="light" />
            </div>
            <Input label="رقم الهاتف" name="phone" value={form.phone} onChange={change} variant="light" />
            <Button type="submit" variant="purple" loading={profileMutation.isPending}>حفظ التغييرات</Button>
          </form>
        </div>

        {/* Change Password */}
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
