import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { ShieldCheck, Users, BookOpen, Mail, Lock, Eye, EyeOff, ChevronUp } from 'lucide-react'
import { useAuthStore } from '../../store/authStore.js'
import { authService } from '../../services/auth.service.js'
import { ROUTES } from '../../config/constants.js'
import {
  T, fu,
  AuthLayout, AuthCard, BrandHeader,
  PremiumInput, PremiumButton, AuthDivider, TrustBar,
} from './AuthShared.jsx'

// ── Dev accounts ──────────────────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'

const DEV_ACCOUNTS = [
  { role: 'admin',   label: 'Admin',   Icon: ShieldCheck, color: '#ef4444', bg: 'rgba(239,68,68,0.09)',  border: 'rgba(239,68,68,0.22)'  },
  { role: 'teacher', label: 'Teacher', Icon: Users,       color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.22)' },
  { role: 'student', label: 'Student', Icon: BookOpen,    color: '#22c55e', bg: 'rgba(34,197,94,0.09)',  border: 'rgba(34,197,94,0.22)'  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [form,       setForm]       = useState({ email: '', password: '' })
  const [showPw,     setShowPw]     = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [devLoading, setDevLoading] = useState(null)
  const [devOpen,    setDevOpen]    = useState(false)
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
      toast.success(`Dev: ${DEV_ACCOUNTS.find(a => a.role === role)?.label}`)
      navigate(getDashboardPath(), { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dev login failed')
    } finally {
      setDevLoading(null)
    }
  }

  return (
    <>
      <AuthLayout ghostSpacerClass="lg:w-[0%] xl:w-[0%]">
        <div className="w-full scale-[0.85]" style={{ maxWidth: '540px' }}>

          <AuthCard delay={0}>

            <BrandHeader
              title="مرحباً بك"
              subtitle="سجّل دخولك للمتابعة في رحلتك القرآنية"
              delay={0.07}
            />

            <form onSubmit={handleSubmit} className="space-y-[18px]">

              <motion.div {...fu(0.12)}>
                <PremiumInput
                  label="البريد الإلكتروني"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={change}
                  placeholder="example@email.com"
                  autoComplete="email"
                  inputDir="ltr"
                  icon={<Mail size={17} strokeWidth={1.8} />}
                />
              </motion.div>

              <motion.div {...fu(0.17)}>
                <PremiumInput
                  label="كلمة المرور"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={change}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  icon={<Lock size={17} strokeWidth={1.8} />}
                  endSlot={
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      className="flex items-center justify-center w-8 h-8 rounded-[10px] transition-all duration-150"
                      style={{ color: T.textMuted }}
                      onMouseEnter={e => { e.currentTarget.style.color = T.purple; e.currentTarget.style.background = T.purpleLight }}
                      onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = 'transparent' }}
                    >
                      {showPw ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
                    </button>
                  }
                />
              </motion.div>

              {/* Forgot password */}
              <motion.div {...fu(0.20)} className="flex justify-start pt-[2px]">
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  className="text-[13px] font-semibold transition-all duration-150"
                  style={{ color: T.purple }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = T.purpleDark
                    e.currentTarget.style.textDecoration = 'underline'
                    e.currentTarget.style.textUnderlineOffset = '3px'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = T.purple
                    e.currentTarget.style.textDecoration = 'none'
                  }}
                >
                  نسيت كلمة المرور؟
                </Link>
              </motion.div>

              <motion.div {...fu(0.23)}>
                <PremiumButton loading={loading}>تسجيل الدخول</PremiumButton>
              </motion.div>

            </form>

            <AuthDivider />

            {/* Register CTA — premium outline */}
            <motion.div {...fu(0.30)}>
              <Link
                to={ROUTES.REGISTER}
                className="flex items-center justify-center gap-2 w-full font-heading font-semibold text-[14px] rounded-[16px] transition-all duration-200 active:scale-[0.987]"
                style={{
                  height:     '54px',
                  background: 'transparent',
                  border:     '1.5px solid rgba(124,58,237,0.22)',
                  color:      T.purple,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background  = T.purpleLight
                  e.currentTarget.style.borderColor = 'rgba(124,58,237,0.40)'
                  e.currentTarget.style.transform   = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow   = '0 6px 20px rgba(124,58,237,0.10)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background  = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(124,58,237,0.22)'
                  e.currentTarget.style.transform   = 'translateY(0)'
                  e.currentTarget.style.boxShadow   = 'none'
                }}
              >
                ليس لديك حساب؟&nbsp;<span className="font-bold">سجّل مجاناً</span>
              </Link>
            </motion.div>

          </AuthCard>

          <TrustBar delay={0.34} />

        </div>
      </AuthLayout>

      {/* ── Dev FAB — position: fixed, z-200, zero layout impact ── */}
      {IS_DEV && (
        <div
          style={{
            position: 'fixed', bottom: '24px', right: '24px',
            zIndex: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px',
          }}
        >
          <AnimatePresence>
            {devOpen && (
              <motion.div
                dir="ltr"
                initial={{ opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={  { opacity: 0, y: 10,  scale: 0.94 }}
                transition={{ duration: 0.20, ease: [0.22, 0.85, 0.22, 1] }}
                style={{
                  background:           'rgba(10,5,22,0.97)',
                  backdropFilter:       'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border:               '1px solid rgba(251,191,36,0.22)',
                  borderRadius:         '20px',
                  padding:              '16px',
                  width:                '272px',
                  boxShadow:            '0 24px 56px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.35)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-none"
                    style={{ background: '#fbbf24', boxShadow: '0 0 6px rgba(251,191,36,0.8)' }}
                  />
                  <span className="text-[10px] font-bold uppercase" style={{ letterSpacing: '1.5px', color: '#fbbf24' }}>
                    Dev Quick Access
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {DEV_ACCOUNTS.map(acc => (
                    <button
                      key={acc.role}
                      onClick={() => handleDevLogin(acc.role)}
                      disabled={devLoading !== null}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-[13px] text-center transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: acc.bg, border: `1px solid ${acc.border}`, color: acc.color }}
                    >
                      {devLoading === acc.role
                        ? <span className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: acc.color }} />
                        : <acc.Icon size={18} strokeWidth={1.8} />
                      }
                      <span className="text-[11px] font-bold">{acc.label}</span>
                    </button>
                  ))}
                </div>

                <p className="text-center text-[10px] mt-3" style={{ color: 'rgba(251,191,36,0.38)' }}>
                  Hidden in production · {import.meta.env.MODE}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setDevOpen(v => !v)}
            className="flex items-center gap-2 px-3.5 rounded-[13px] font-bold transition-all duration-200 hover:scale-[1.05] active:scale-[0.97]"
            style={{
              height:               '42px',
              background:           'rgba(10,5,22,0.95)',
              border:               `1px solid ${devOpen ? 'rgba(251,191,36,0.50)' : 'rgba(251,191,36,0.30)'}`,
              boxShadow:            devOpen
                ? '0 0 0 2px rgba(251,191,36,0.15), 0 8px 20px rgba(0,0,0,0.40)'
                : '0 4px 16px rgba(0,0,0,0.35)',
              backdropFilter:       'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              cursor:               'pointer',
            }}
          >
            <span className="text-[11px] font-bold tracking-[1px] uppercase" style={{ color: '#fbbf24' }}>DEV</span>
            <motion.span
              animate={{ rotate: devOpen ? 0 : 180 }}
              transition={{ duration: 0.22 }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              <ChevronUp size={13} strokeWidth={2.5} color="#fbbf24" />
            </motion.span>
          </button>
        </div>
      )}
    </>
  )
}
