import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
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
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="font-heading font-extrabold text-3xl text-white">نسيت كلمة المرور؟</h1>
          <p className="text-sm mt-2" style={{ color: '#b6a6d8' }}>أدخل بريدك وسنرسل لك رابط إعادة التعيين</p>
        </div>
        <div className="rounded-[28px] p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(160,130,230,0.18)' }}>
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
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
