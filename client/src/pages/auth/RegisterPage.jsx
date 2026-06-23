import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore.js'
import { authService } from '../../services/auth.service.js'
import { ROUTES } from '../../config/constants.js'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'

export default function RegisterPage() {
  const [form, setForm] = useState({ firstNameAr: '', lastNameAr: '', email: '', phone: '', password: '', role: 'student' })
  const [loading, setLoading] = useState(false)
  const { setAuth, getDashboardPath } = useAuthStore()
  const navigate = useNavigate()

  function change(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 8) return toast.error('كلمة المرور يجب أن تكون ٨ أحرف على الأقل')
    setLoading(true)
    try {
      const res = await authService.register({
        ...form,
        firstName: form.firstNameAr,
        lastName: form.lastNameAr,
      })
      const { user, accessToken } = res.data.data
      setAuth(user, accessToken)
      toast.success('تم إنشاء حسابك بنجاح! أهلاً بك في ترتيلة.')
      navigate(getDashboardPath(), { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء التسجيل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center py-12 px-[clamp(18px,4vw,46px)]" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
        className="w-full max-w-[520px]"
      >
        <div className="text-center mb-8">
          <div className="w-[60px] h-[60px] rounded-[16px] flex items-center justify-center mx-auto mb-4" style={{ border: '1.5px solid rgba(212,175,55,0.6)', background: 'rgba(20,5,46,0.4)' }}>
            <svg width="34" height="34" viewBox="0 0 32 32" fill="none"><circle cx="24.5" cy="6" r="2.4" stroke="#E8C76A" strokeWidth="1.4"/><path d="M16 6.5c2.6 0 4.2 2 4.2 4.2H11.8C11.8 8.5 13.4 6.5 16 6.5Z" stroke="#E8C76A" strokeWidth="1.4" strokeLinejoin="round"/><path d="M16 8.7v2.2" stroke="#E8C76A" strokeWidth="1.4"/><path d="M8 27V15.5c0-1 .6-1.9 1.5-2.3L16 10l6.5 3.2c.9.4 1.5 1.3 1.5 2.3V27" stroke="#E8C76A" strokeWidth="1.4" strokeLinejoin="round"/><path d="M13.2 27v-4.4c0-1.5 1.2-2.7 2.8-2.7s2.8 1.2 2.8 2.7V27" stroke="#E8C76A" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5.5 27h21" stroke="#E8C76A" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-white">إنشاء حساب جديد</h1>
          <p className="text-sm mt-2" style={{ color: '#b6a6d8' }}>ابدأ رحلتك مع القرآن الكريم اليوم</p>
        </div>

        <div className="rounded-[28px] p-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(160,130,230,0.18)', backdropFilter: 'blur(8px)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="الاسم الأول" name="firstNameAr" value={form.firstNameAr} onChange={change} placeholder="أحمد" required />
              <Input label="اسم العائلة" name="lastNameAr" value={form.lastNameAr} onChange={change} placeholder="محمد" required />
            </div>
            <Input label="البريد الإلكتروني" name="email" type="email" value={form.email} onChange={change} placeholder="example@email.com" required />
            <Input label="رقم الهاتف" name="phone" type="tel" value={form.phone} onChange={change} placeholder="+966 5X XXX XXXX" />
            <Input label="كلمة المرور" name="password" type="password" value={form.password} onChange={change} placeholder="٨ أحرف على الأقل" required />

            <Button type="submit" variant="purple" fullWidth loading={loading} size="lg">
              إنشاء الحساب
            </Button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: '#b6a6d8' }}>
            لديك حساب؟{' '}
            <Link to={ROUTES.LOGIN} className="font-bold" style={{ color: '#9b6cf0' }}>سجّل دخولك</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
