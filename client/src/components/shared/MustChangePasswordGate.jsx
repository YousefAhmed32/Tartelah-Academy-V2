import { useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound } from 'lucide-react'
import { useAuthStore } from '../../store/authStore.js'
import { authService } from '../../services/auth.service.js'
import Modal from '../ui/Modal.jsx'
import Input from '../ui/Input.jsx'
import Button from '../ui/Button.jsx'

// Blocking gate rendered at the app root — enforces "force password change
// on next login" for any account created/reset with mustChangePassword
// (temporary passwords set by an admin, see user.controller.js
// createUser/resetUserPassword). Not closable/dismissable: the only way
// through is a successful password change, which is what actually clears
// the flag server-side (auth.controller.js changePassword).
export default function MustChangePasswordGate() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  if (!user?.mustChangePassword) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.newPassword.length < 8) return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    if (form.newPassword !== form.confirm) return toast.error('كلمتا المرور غير متطابقتين')
    setLoading(true)
    try {
      const res = await authService.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      setUser(res.data.data.user)
      toast.success('تم تغيير كلمة المرور بنجاح')
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open title="مطلوب تغيير كلمة المرور" size="sm" closable={false}>
      <div dir="rtl" className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl px-3.5 py-2.5 text-sm font-semibold">
          <KeyRound size={16} /> يجب تغيير كلمة المرور المؤقتة قبل المتابعة
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="كلمة المرور الحالية" variant="light" type="password" value={form.currentPassword}
            onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))} required />
          <Input label="كلمة المرور الجديدة" variant="light" type="password" value={form.newPassword}
            onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))} required />
          <Input label="تأكيد كلمة المرور الجديدة" variant="light" type="password" value={form.confirm}
            onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))} required />
          <Button type="submit" variant="purple" fullWidth loading={loading}>تغيير كلمة المرور</Button>
        </form>
      </div>
    </Modal>
  )
}
