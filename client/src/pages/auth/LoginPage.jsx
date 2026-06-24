import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore.js'
import { authService } from '../../services/auth.service.js'
import { ROUTES } from '../../config/constants.js'
import Input from '../../components/ui/Input.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

const IS_DEV = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'

const DEV_ACCOUNTS = [
  {
    role: 'admin',
    label: 'Login as Admin',
    labelAr: 'مدير',
    icon: '🛡️',
    email: 'admin@tartelah.com',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
  },
  {
    role: 'teacher',
    label: 'Login as Teacher',
    labelAr: 'معلم',
    icon: '👨‍🏫',
    email: 'teacher@tartelah.com',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
  },
  {
    role: 'student',
    label: 'Login as Student',
    labelAr: 'طالب',
    icon: '📚',
    email: 'student@tartelah.com',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
  },
]

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [devLoading, setDevLoading] = useState(null)
  const { setAuth, getDashboardPath } = useAuthStore()
  const navigate = useNavigate()

  function change(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('يرجى ملء جميع الحقول')
    setLoading(true)
    try {
      const res = await authService.login(form)
      const { user, accessToken } = res.data.data
      setAuth(user, accessToken)
      toast.success(`أهلاً ${user.firstNameAr || user.firstName}!`)
      navigate(getDashboardPath(), { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'بيانات الدخول غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  async function handleDevLogin(role) {
    setDevLoading(role)
    try {
      const res = await authService.devLogin(role)
      const { user, accessToken } = res.data.data
      setAuth(user, accessToken)
      const acc = DEV_ACCOUNTS.find(a => a.role === role)
      toast.success(`Dev: logged in as ${acc?.labelAr || role}`)
      navigate(getDashboardPath(), { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dev login failed')
    } finally {
      setDevLoading(null)
    }
  }

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(120% 80% at 12% 18%, #3a1273 0%, #23104f 38%, #160734 72%)' }}
      dir="rtl"
    >
      {/* Top lang bar */}
      <div className="flex justify-start px-[clamp(18px,4vw,46px)] pt-[22px]">
        <button className="flex items-center gap-2 text-[#e7ddff] text-sm font-semibold px-4 py-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(160,130,230,0.28)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#cbb8f0" strokeWidth="1.5"/><path d="M3 12h18M12 3c2.5 2.7 4 6.2 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.2-4-10s1.5-7.3 4-10Z" stroke="#cbb8f0" strokeWidth="1.5"/></svg>
          العربية
        </button>
      </div>

      <div className="flex-1 flex items-center gap-[clamp(20px,3vw,48px)] px-[clamp(18px,4vw,46px)] py-8 max-w-[1500px] mx-auto w-full">
        {/* Left pane - branding */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}
          className="flex-1 hidden lg:flex flex-col min-w-0"
        >
          {/* Logo */}
          <div className="flex items-center gap-[13px]">
            <div className="flex-none w-[60px] h-[60px] rounded-[16px] overflow-hidden flex items-center justify-center" style={{ border: '1.5px solid rgba(212,175,55,0.6)', background: 'rgba(20,5,46,0.4)' }}>
              <img src="/logo-png.png" alt="ترتيلة" className="w-full h-full object-contain p-1.5" />
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <div className="font-heading font-extrabold text-[26px] text-white">ترتيلة</div>
              <div className="text-[13px] tracking-[1px] font-semibold" style={{ color: '#b29bdf' }}>Tartelah Online</div>
            </div>
          </div>

          {/* Image placeholder */}
          <div className="flex-1 flex items-center justify-center my-8">
            <div className="w-full max-w-[420px] h-[280px] rounded-card flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(150,120,220,0.12)' }}>
              <div className="text-center">
                <div className="text-6xl mb-4">📖</div>
                <div className="font-heading font-bold text-xl text-white">منصة ترتيلة</div>
                <div className="text-sm mt-2" style={{ color: '#b3a4d0' }}>تعلم القرآن الكريم أونلاين</div>
              </div>
            </div>
          </div>

          {/* Quran verse */}
          <div className="text-center mt-4">
            <div className="font-quran text-2xl text-brand-gold leading-relaxed">
              <span style={{ color: 'rgba(232,199,106,0.5)', fontSize: '1.3em' }}>"</span>
              وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
              <span style={{ color: 'rgba(232,199,106,0.5)', fontSize: '1.3em' }}>"</span>
            </div>
            <div className="mt-2 text-sm" style={{ color: '#b6a6d8' }}>سورة المزمل - الآية 4</div>
          </div>

          {/* Features */}
          <div className="flex gap-6 justify-center mt-8 flex-wrap">
            {[
              { icon: '👨‍🏫', title: 'معلمون متخصصون', sub: 'نخبة من أفضل المعلمين' },
              { icon: '📅', title: 'جدول مرن', sub: 'في الوقت الذي يناسبك' },
              { icon: '📊', title: 'متابعة مستمرة', sub: 'تقارير دورية مفصّلة' },
            ].map((f, i) => (
              <div key={i} className="text-center flex-1 min-w-[100px]">
                <div className="text-3xl mb-2">{f.icon}</div>
                <div className="font-heading font-bold text-white text-sm">{f.title}</div>
                <div className="text-xs mt-1" style={{ color: '#a89cc6' }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right pane - form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="flex-1 max-w-[480px] mx-auto lg:mx-0"
        >
          <div className="rounded-[28px] p-8 lg:p-10" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(160,130,230,0.18)', backdropFilter: 'blur(8px)' }}>
            <h1 className="font-heading font-extrabold text-3xl text-white mb-1">مرحباً بك</h1>
            <p className="text-sm mb-8" style={{ color: '#b6a6d8' }}>سجّل دخولك للمتابعة في رحلتك القرآنية</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="البريد الإلكتروني"
                name="email"
                type="email"
                value={form.email}
                onChange={change}
                placeholder="example@email.com"
                required
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6"/><path d="m22 6-10 7L2 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>}
              />
              <Input
                label="كلمة المرور"
                name="password"
                type="password"
                value={form.password}
                onChange={change}
                placeholder="••••••••"
                required
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded accent-brand-purple" />
                  <span className="text-sm" style={{ color: '#b6a6d8' }}>تذكرني</span>
                </label>
                <Link to={ROUTES.FORGOT_PASSWORD} className="text-sm font-semibold" style={{ color: '#9b6cf0' }}>
                  نسيت كلمة المرور؟
                </Link>
              </div>

              <Button type="submit" variant="purple" fullWidth loading={loading} size="lg">
                تسجيل الدخول
              </Button>
            </form>

            <p className="text-center text-sm mt-6" style={{ color: '#b6a6d8' }}>
              ليس لديك حساب؟{' '}
              <Link to={ROUTES.REGISTER} className="font-bold" style={{ color: '#9b6cf0' }}>
                سجّل الآن مجاناً
              </Link>
            </p>
          </div>

          {/* Trust bar */}
          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
            {['🔒 تشفير آمن', '✅ معتمد', '⭐ ٤.٩/٥ تقييم'].map((t, i) => (
              <span key={i} className="text-xs font-medium" style={{ color: '#a89cc6' }}>{t}</span>
            ))}
          </div>

          {/* ── Development Quick Access ── */}
          {IS_DEV && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.35 }}
              className="mt-4"
            >
              <div
                className="rounded-[20px] p-5"
                style={{
                  background: 'rgba(251,191,36,0.04)',
                  border: '1px solid rgba(251,191,36,0.18)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: '#fbbf24', boxShadow: '0 0 6px rgba(251,191,36,0.7)', animation: 'pulse 2s infinite' }}
                  />
                  <span
                    className="text-[10px] font-bold tracking-[2px] uppercase"
                    style={{ color: '#fbbf24' }}
                  >
                    Development Quick Access
                  </span>
                </div>

                {/* Credential hint */}
                <div className="mb-3 text-[11px] font-mono text-center leading-relaxed" style={{ color: 'rgba(251,191,36,0.55)' }}>
                  admin@tartelah.com · teacher@tartelah.com · student@tartelah.com
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-3 gap-2" dir="ltr">
                  {DEV_ACCOUNTS.map(acc => (
                    <button
                      key={acc.role}
                      onClick={() => handleDevLogin(acc.role)}
                      disabled={devLoading !== null}
                      className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-[14px] text-center transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: acc.bg,
                        border: `1px solid ${acc.border}`,
                        color: acc.color,
                      }}
                    >
                      {devLoading === acc.role ? (
                        <div
                          className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                          style={{ borderColor: `${acc.color} transparent transparent transparent` }}
                        />
                      ) : (
                        <span className="text-xl leading-none">{acc.icon}</span>
                      )}
                      <span className="text-[11px] font-bold leading-tight">{acc.label}</span>
                      <span className="text-[10px] opacity-60 leading-none">{acc.labelAr}</span>
                    </button>
                  ))}
                </div>

                {/* Footer note */}
                <p className="text-center text-[10px] mt-3" style={{ color: 'rgba(251,191,36,0.4)' }}>
                  ⚠ Hidden in production · NODE_ENV = {import.meta.env.MODE}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

