import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LockKeyhole, CircleCheck } from 'lucide-react'
import { authService } from '../../services/auth.service.js'
import { ROUTES } from '../../config/constants.js'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
      toast.success('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني')
    } catch (err) {
      toast.error(err.response?.data?.message || 'البريد الإلكتروني غير مسجل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" dir="rtl">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <LockKeyhole size={28} strokeWidth={1.6} color="#9b6cf0" />
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-white">نسيت كلمة المرور؟</h1>
          <p className="text-sm mt-2" style={{ color: '#b6a6d8' }}>أدخل بريدك وسنرسل لك رابط إعادة التعيين</p>
        </div>
        <div className="rounded-[28px] p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(160,130,230,0.18)' }}>
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <CircleCheck size={26} strokeWidth={1.6} color="#22c55e" />
              </div>
              <h2 className="font-heading font-bold text-xl text-white mb-2">تم الإرسال!</h2>
              <p className="text-sm" style={{ color: '#b6a6d8' }}>تحقق من صندوق البريد الإلكتروني وافتح الرابط لإعادة تعيين كلمة المرور.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input label="البريد الإلكتروني" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" required />
              <Button type="submit" variant="purple" fullWidth loading={loading} size="lg">إرسال رابط الاسترداد</Button>
            </form>
          )}
          <div className="text-center mt-5">
            <Link to={ROUTES.LOGIN} className="text-sm font-semibold" style={{ color: '#9b6cf0' }}>← العودة لتسجيل الدخول</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
