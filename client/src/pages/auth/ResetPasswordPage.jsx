import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { KeyRound } from 'lucide-react'
import { authService } from '../../services/auth.service.js'
import { ROUTES } from '../../config/constants.js'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) return toast.error('كلمتا المرور غير متطابقتين')
    if (form.password.length < 8) return toast.error('كلمة المرور يجب أن تكون ٨ أحرف على الأقل')
    setLoading(true)
    try {
      await authService.resetPassword(token, form.password)
      toast.success('تم إعادة تعيين كلمة المرور بنجاح')
      navigate(ROUTES.LOGIN, { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'الرابط غير صالح أو منتهي الصلاحية')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" dir="rtl">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <KeyRound size={28} strokeWidth={1.6} color="#9b6cf0" />
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-white">إعادة تعيين كلمة المرور</h1>
          <p className="text-sm mt-2" style={{ color: '#b6a6d8' }}>أدخل كلمة مرور جديدة وقوية</p>
        </div>
        <div className="rounded-[28px] p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(160,130,230,0.18)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="كلمة المرور الجديدة" name="password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="٨ أحرف على الأقل" required />
            <Input label="تأكيد كلمة المرور" name="confirm" type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} placeholder="أعد كتابة كلمة المرور" required />
            <Button type="submit" variant="purple" fullWidth loading={loading} size="lg">حفظ كلمة المرور</Button>
          </form>
          <div className="text-center mt-5">
            <Link to={ROUTES.LOGIN} className="text-sm font-semibold" style={{ color: '#9b6cf0' }}>← العودة لتسجيل الدخول</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
