import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, Phone, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore.js'
import { authService } from '../../services/auth.service.js'
import { ROUTES } from '../../config/constants.js'
import {
  T, fu,
  AuthLayout, AuthCard, BrandHeader,
  PremiumInput, PremiumButton, AuthDivider, TrustBar,
} from './AuthShared.jsx'

// ── Password strength engine ──────────────────────────────────────────────────

const PW_CHECKS = [
  { key: 'length',  test: pw => pw.length >= 8,          label: '٨ أحرف على الأقل' },
  { key: 'upper',   test: pw => /[A-Z]/.test(pw),        label: 'حرف كبير'           },
  { key: 'lower',   test: pw => /[a-z]/.test(pw),        label: 'حرف صغير'           },
  { key: 'number',  test: pw => /[0-9]/.test(pw),        label: 'رقم'                },
  { key: 'special', test: pw => /[^A-Za-z0-9]/.test(pw), label: 'رمز خاص'            },
]

const STRENGTH_LEVELS = [
  null,
  { label: 'ضعيفة جداً', color: '#ef4444' },
  { label: 'ضعيفة',      color: '#f97316' },
  { label: 'مقبولة',     color: '#eab308' },
  { label: 'قوية',       color: '#84cc16' },
  { label: 'قوية جداً',  color: '#22c55e' },
]

function PasswordStrength({ password }) {
  if (!password) return null

  const results = PW_CHECKS.map(c => ({ ...c, pass: c.test(password) }))
  const score   = results.filter(r => r.pass).length
  const level   = STRENGTH_LEVELS[score]

  return (
    <AnimatePresence>
      <motion.div
        key="pw-strength"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={  { opacity: 0, height: 0 }}
        transition={{ duration: 0.22, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="pt-2 pb-1 px-[2px]">

          {/* Segmented strength bar */}
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map(n => (
              <motion.div
                key={n}
                className="flex-1 h-[3px] rounded-full"
                animate={{ background: n <= score ? level?.color : T.border }}
                transition={{ duration: 0.28, delay: n * 0.04, ease: 'easeOut' }}
              />
            ))}
          </div>

          {/* Level label + requirements grid */}
          <div className="flex items-start justify-between gap-2">

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 flex-1">
              {results.map(({ key, label, pass }) => (
                <motion.div
                  key={key}
                  className="flex items-center gap-1.5"
                  animate={{ color: pass ? '#22c55e' : T.textMuted }}
                  transition={{ duration: 0.22 }}
                  style={{ fontSize: '11px', fontWeight: 500 }}
                >
                  <motion.span
                    animate={{ scale: pass ? [1.4, 1] : 1 }}
                    transition={{ duration: 0.18 }}
                    style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1 }}
                  >
                    {pass ? '✓' : '○'}
                  </motion.span>
                  {label}
                </motion.div>
              ))}
            </div>

            {level && (
              <span
                className="text-[11px] font-bold flex-none mt-[1px]"
                style={{ color: level.color }}
              >
                {level.label}
              </span>
            )}

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstNameAr:     '',
    lastNameAr:      '',
    email:           '',
    phone:           '',
    password:        '',
    confirmPassword: '',
  })
  const [showPw,    setShowPw]    = useState(false)
  const [showPw2,   setShowPw2]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const { setAuth, getDashboardPath } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Set when arriving from a Teacher Profile page's "سجّل الآن مع ..." CTA —
  // preserves the visitor's chosen teacher into the enrollment step instead
  // of silently dropping it at the generic registration form.
  const preferredTeacherId = searchParams.get('teacherId')
  const preferredTeacherName = searchParams.get('teacherName')

  function change(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.firstNameAr || !form.lastNameAr) return toast.error('يرجى إدخال الاسم الأول والأخير')
    if (!form.email)                            return toast.error('يرجى إدخال البريد الإلكتروني')
    if (form.password.length < 8)              return toast.error('كلمة المرور يجب أن تكون ٨ أحرف على الأقل')
    if (form.password !== form.confirmPassword) return toast.error('كلمتا المرور غير متطابقتين')
    setLoading(true)
    try {
      const res = await authService.register({
        firstNameAr: form.firstNameAr,
        lastNameAr:  form.lastNameAr,
        firstName:   form.firstNameAr,
        lastName:    form.lastNameAr,
        email:       form.email,
        phone:       form.phone,
        password:    form.password,
      })
      const { user, accessToken } = res.data.data
      setAuth(user, accessToken)
      if (preferredTeacherId) {
        localStorage.setItem('preferredTeacherId', preferredTeacherId)
        if (preferredTeacherName) localStorage.setItem('preferredTeacherName', preferredTeacherName)
      }
      toast.success('تم إنشاء حسابك بنجاح! أهلاً بك في ترتيلة.')
      navigate(getDashboardPath(), { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء التسجيل')
    } finally {
      setLoading(false)
    }
  }

  // Eye toggle endSlot — reusable inline
  const eyeToggle = (show, setter) => (
    <button
      type="button"
      onClick={() => setter(v => !v)}
      className="flex items-center justify-center w-8 h-8 rounded-[10px] transition-all duration-150"
      style={{ color: T.textMuted }}
      onMouseEnter={e => { e.currentTarget.style.color = T.purple; e.currentTarget.style.background = T.purpleLight }}
      onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = 'transparent' }}
    >
      {show ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
    </button>
  )

  return (
    <AuthLayout ghostSpacerClass="lg:w-[0%] xl:w-[0%] ">
      <div className="w-full  scale-[0.85]" style={{ maxWidth: '620px' }}>

        <AuthCard delay={0}>

          <BrandHeader
            title="أنشئ حسابك"
            subtitle="ابدأ رحلتك مع القرآن الكريم في دقائق معدودة."
            delay={0.07}
            bottomMargin="mb-6"
          />

          {preferredTeacherName && (
            <div
              className="mb-5 rounded-2xl px-4 py-3 text-sm font-semibold text-center"
              style={{ background: 'rgba(232,199,106,0.12)', color: T.purpleDark, border: '1px solid rgba(212,175,55,0.35)' }}
            >
              ستبدأ رحلتك مع {preferredTeacherName}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ── Name row: two columns ── */}
            <motion.div {...fu(0.11)} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-[18px]">
              <PremiumInput
                label="الاسم الأول"
                name="firstNameAr"
                value={form.firstNameAr}
                onChange={change}
                placeholder="أحمد"
                autoComplete="given-name"
                required
                icon={<User size={17} strokeWidth={1.8} />}
              />
              <PremiumInput
                label="اسم العائلة"
                name="lastNameAr"
                value={form.lastNameAr}
                onChange={change}
                placeholder="محمد"
                autoComplete="family-name"
                required
                icon={<User size={17} strokeWidth={1.8} />}
              />
            </motion.div>

            <div className="space-y-[18px]">

              {/* Email */}
              <motion.div {...fu(0.15)}>
                <PremiumInput
                  label="البريد الإلكتروني"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={change}
                  placeholder="example@email.com"
                  autoComplete="email"
                  inputDir="ltr"
                  required
                  icon={<Mail size={17} strokeWidth={1.8} />}
                />
              </motion.div>

              {/* Phone */}
              <motion.div {...fu(0.19)}>
                <PremiumInput
                  label="رقم الهاتف"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={change}
                  placeholder="+966 5X XXX XXXX"
                  autoComplete="tel"
                  inputDir="ltr"
                  icon={<Phone size={17} strokeWidth={1.8} />}
                />
              </motion.div>

              {/* Password + strength */}
              <motion.div {...fu(0.23)}>
                <PremiumInput
                  label="كلمة المرور"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={change}
                  placeholder="٨ أحرف على الأقل"
                  autoComplete="new-password"
                  required
                  icon={<Lock size={17} strokeWidth={1.8} />}
                  endSlot={eyeToggle(showPw, setShowPw)}
                />
                <PasswordStrength password={form.password} />
              </motion.div>

              {/* Confirm password */}
              <motion.div {...fu(0.27)}>
                <PremiumInput
                  label="تأكيد كلمة المرور"
                  name="confirmPassword"
                  type={showPw2 ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={change}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  icon={<Lock size={17} strokeWidth={1.8} />}
                  endSlot={eyeToggle(showPw2, setShowPw2)}
                />
                {/* Live match / mismatch feedback */}
                <AnimatePresence mode="wait">
                  {form.confirmPassword && (
                    <motion.p
                      key={form.password === form.confirmPassword ? 'ok' : 'no'}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={  { opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className="text-[12px] font-semibold mt-2 px-[2px]"
                      style={{ color: form.password === form.confirmPassword ? '#22c55e' : '#ef4444' }}
                    >
                      {form.password === form.confirmPassword
                        ? '✓ كلمتا المرور متطابقتان'
                        : '✗ كلمتا المرور غير متطابقتين'
                      }
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Privacy note */}
              <motion.div {...fu(0.30)}>
                <p className="text-[12px] text-center leading-relaxed" style={{ color: T.textMuted }}>
                  بالتسجيل، أنت توافق على{' '}
                  <span
                    className="font-semibold cursor-pointer transition-colors"
                    style={{ color: T.purple }}
                    onMouseEnter={e => e.currentTarget.style.color = T.purpleDark}
                    onMouseLeave={e => e.currentTarget.style.color = T.purple}
                  >
                    سياسة الخصوصية
                  </span>
                  {' '}و{' '}
                  <span
                    className="font-semibold cursor-pointer transition-colors"
                    style={{ color: T.purple }}
                    onMouseEnter={e => e.currentTarget.style.color = T.purpleDark}
                    onMouseLeave={e => e.currentTarget.style.color = T.purple}
                  >
                    الشروط والأحكام
                  </span>
                </p>
              </motion.div>

              {/* Submit */}
              <motion.div {...fu(0.33)}>
                <PremiumButton loading={loading}>إنشاء الحساب</PremiumButton>
              </motion.div>

            </div>
          </form>

          <AuthDivider />

          {/* Login link */}
          <motion.div {...fu(0.37)}>
            <Link
              to={ROUTES.LOGIN}
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
              لديك حساب بالفعل؟&nbsp;<span className="font-bold">تسجيل الدخول</span>
            </Link>
          </motion.div>

        </AuthCard>

        <TrustBar delay={0.40} />

      </div>
    </AuthLayout>
  )
}
