/**
 * Shared authentication design system.
 * LoginPage and RegisterPage import from here so both pages
 * are guaranteed to share every visual token, component, and
 * animation — changing one updates both.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, CircleCheck, Star } from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
// Single source of truth for all auth-page colors.

export const T = {
  card:        'rgba(255,255,255,0.98)',
  inputBg:     '#FDFCFF',
  inputBgFoc:  '#FFFFFF',
  border:      '#E6E0F2',
  borderFoc:   '#7C3AED',
  text:        '#1A1030',
  textSec:     '#5E5676',
  textMuted:   '#A09AB8',
  purple:      '#7C3AED',
  purpleDark:  '#5B21B6',
  purpleLight: '#F5F3FF',
  purpleMid:   '#EDE9FD',
  gold:        '#D4AF37',
  goldBorder:  'rgba(212,175,55,0.45)',
  goldLight:   'rgba(212,175,55,0.12)',
}

// ── Motion preset ─────────────────────────────────────────────────────────────
// Blur-in from below. Use delay to stagger child elements.

export const fu = (delay = 0) => ({
  initial:    { opacity: 0, y: 16, filter: 'blur(6px)' },
  animate:    { opacity: 1, y: 0,  filter: 'blur(0px)' },
  transition: { duration: 0.52, delay, ease: [0.22, 0.85, 0.22, 1] },
})

// ── BackgroundCanvas ──────────────────────────────────────────────────────────
// Fixed full-bleed artwork layer. The entire auth experience lives on top of it.
// Five overlay passes build depth: vignette → brand glow → depth → card-zone
// luminance → mobile legibility. No hard edges anywhere.

export function BackgroundCanvas() {
  return (
    <div className="fixed inset-0 z-0">

      <img
        src="/login-background.png"
        alt=""
        loading="eager"
        decoding="async"
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover', objectPosition: 'center 28%' }}
      />

      {/* 1 — Cinematic vignette: darkens perimeter, lifts center */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 40% 50%, transparent 25%, rgba(5,2,18,0.32) 100%)',
      }} />

      {/* 2 — Bottom-left brand glow */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 12% 88%, rgba(78,42,122,0.30) 0%, transparent 58%)',
      }} />

      {/* 3 — Top-left depth */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 8% 12%, rgba(90,50,160,0.16) 0%, transparent 48%)',
      }} />

      {/* 4 — Right-zone soft luminance (card area) — imperceptible as a layer,
              felt as open space where the card breathes */}
      <div className="absolute inset-0 hidden lg:block" style={{
        background: 'radial-gradient(ellipse at 78% 50%, rgba(240,235,255,0.11) 0%, transparent 55%)',
      }} />

      {/* 5 — Mobile legibility wash */}
      <div className="absolute inset-0 lg:hidden" style={{
        background: 'rgba(8,4,24,0.28)',
      }} />

    </div>
  )
}

// ── AuthLayout ────────────────────────────────────────────────────────────────
// Full-page shell: canvas + ghost spacer + form column.
// ghostSpacerClass controls how far left the card sits on desktop.
// Login: lg:w-[43%] xl:w-[55%] → card at ~59% of viewport
// Register: lg:w-[38%] xl:w-[50%] → card at ~53% (wider card needs more room)

export function AuthLayout({ children, ghostSpacerClass = 'lg:w-[43%] xl:w-[55%]' }) {
  return (
    <div dir="ltr" className="relative min-h-screen overflow-x-hidden">
      <BackgroundCanvas />
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        <div className={`hidden lg:block flex-none ${ghostSpacerClass}`} />
        <div
          dir="rtl"
          className="flex-1 flex items-center justify-center px-5 py-10 lg:py-14"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// ── AuthCard ──────────────────────────────────────────────────────────────────
// Floating glass card. Three-layer shadow anchors it against the dark artwork.

export function AuthCard({ children, delay = 0 }) {
  return (
    <motion.div
      {...fu(delay)}
      className="rounded-[40px]"
      style={{
        background:           T.card,
        backdropFilter:       'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border:               '1px solid rgba(255,255,255,0.55)',
        boxShadow: [
          '0 56px 100px rgba(0,0,0,0.55)',
          '0 24px 56px rgba(78,42,122,0.38)',
          '0 4px 12px rgba(0,0,0,0.22)',
        ].join(', '),
        padding: 'clamp(36px,5vw,52px)',
      }}
    >
      {children}
    </motion.div>
  )
}

// ── BrandHeader ───────────────────────────────────────────────────────────────
// Logo badge + brand name + page title + gold divider + subtitle.
// title and subtitle differ between Login and Register.

export function BrandHeader({ title, subtitle, delay = 0.07, bottomMargin = 'mb-7' }) {
  return (
    <motion.div {...fu(delay)} className={`text-center ${bottomMargin}`}>

      {/* Premium badge */}
      <div className="relative mx-auto mb-4" style={{ width: '80px', height: '80px' }}>

        {/* Outer gold halo */}
        <div
          className="absolute rounded-[27px]"
          style={{
            inset:      '-6px',
            background: T.goldLight,
            border:     `1px solid ${T.goldBorder}`,
            opacity:    0.75,
          }}
        />

        {/* Badge shell */}
        <div
          className="relative w-full h-full rounded-[22px] flex items-center justify-center overflow-hidden"
          style={{
            background: '#FFFFFF',
            border:     `1.5px solid ${T.goldBorder}`,
            boxShadow:  '0 10px 32px rgba(78,42,122,0.18), 0 2px 6px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
          }}
        >
          <img
            src="/images/logo.jpg"
            alt="ترتيلة"
            className="object-cover"
            style={{ width: '60px', height: '60px', borderRadius: '14px' }}
          />
        </div>
      </div>

      {/* Brand name */}
      <div className="mb-5">
        <div className="font-heading font-extrabold" style={{ fontSize: '23px', color: T.text, lineHeight: 1.1 }}>
          ترتيلة
        </div>
        <div className="font-bold uppercase mt-[5px]" style={{ fontSize: '9.5px', letterSpacing: '3.5px', color: T.textMuted }}>
          TARTELAH ONLINE
        </div>
      </div>

      {/* Page title */}
      <h1
        className="font-heading font-extrabold leading-tight mb-3"
        style={{ fontSize: 'clamp(26px,3vw,34px)', color: T.text }}
      >
        {title}
      </h1>

      {/* Gold accent */}
      <div
        className="mx-auto mb-3"
        style={{
          width: '36px', height: '2.5px', borderRadius: '2px',
          background: `linear-gradient(90deg, ${T.gold}, #E8C76A)`,
        }}
      />

      <p style={{ fontSize: '14px', color: T.textSec, lineHeight: 1.6 }}>
        {subtitle}
      </p>
    </motion.div>
  )
}

// ── PremiumInput ──────────────────────────────────────────────────────────────
// Shared premium input field.
// icon:     lucide element, positioned at reading-start (right in RTL)
// endSlot:  any node, positioned at reading-end (left in RTL)
// inputDir: pass "ltr" for email/phone fields in an RTL form context

export function PremiumInput({
  label, name, type = 'text', value, onChange, placeholder,
  icon, endSlot, autoComplete, required, inputDir,
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div>
      <label
        htmlFor={name}
        className="block text-[13px] font-semibold mb-2 transition-colors duration-150"
        style={{ color: focused ? T.purple : T.text }}
      >
        {label}
      </label>

      <div
        className="relative transition-all duration-200"
        style={{
          borderRadius: '14px',
          border:       `1.5px solid ${focused ? T.borderFoc : T.border}`,
          boxShadow:    focused
            ? '0 0 0 4px rgba(124,58,237,0.11), 0 2px 8px rgba(26,16,48,0.06)'
            : '0 1px 4px rgba(26,16,48,0.05)',
          background:   focused ? T.inputBgFoc : T.inputBg,
        }}
      >
        {icon && (
          <span
            className="absolute right-[18px] top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
            style={{ color: focused ? T.purple : T.textMuted }}
          >
            {icon}
          </span>
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          dir={inputDir}
          onFocus={() => setFocused(true)}
          onBlur={()  => setFocused(false)}
          className="w-full outline-none text-[15px] font-medium"
          style={{
            height:       '58px',
            paddingRight: icon    ? '50px' : '18px',
            paddingLeft:  endSlot ? '50px' : '18px',
            background:   'transparent',
            color:        T.text,
            borderRadius: '14px',
          }}
        />

        {endSlot && (
          <span className="absolute left-[14px] top-1/2 -translate-y-1/2">
            {endSlot}
          </span>
        )}
      </div>
    </div>
  )
}

// ── PremiumButton ─────────────────────────────────────────────────────────────
// Full-width luxury purple gradient button. Loading state included.

export function PremiumButton({ children, loading, disabled, type = 'submit', onClick }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className="relative w-full font-heading font-bold text-[15px] text-white rounded-[16px] transition-all duration-200 active:scale-[0.986]"
      style={{
        height:     '60px',
        background: 'linear-gradient(135deg, #8244F0 0%, #7C3AED 42%, #5B21B6 100%)',
        boxShadow:  (loading || disabled)
          ? 'none'
          : '0 12px 32px rgba(124,58,237,0.40), 0 3px 8px rgba(124,58,237,0.22), inset 0 1px 0 rgba(255,255,255,0.18)',
        opacity: (loading || disabled) ? 0.75 : 1,
        cursor:  (loading || disabled) ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => {
        if (!loading && !disabled) {
          e.currentTarget.style.transform  = 'translateY(-1.5px)'
          e.currentTarget.style.boxShadow  = '0 20px 44px rgba(124,58,237,0.50), 0 4px 12px rgba(124,58,237,0.28), inset 0 1px 0 rgba(255,255,255,0.18)'
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(124,58,237,0.40), 0 3px 8px rgba(124,58,237,0.22), inset 0 1px 0 rgba(255,255,255,0.18)'
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2.5">
          <span
            className="w-[18px] h-[18px] rounded-full animate-spin"
            style={{
              border:         '2.5px solid rgba(255,255,255,0.28)',
              borderTopColor: 'rgba(255,255,255,0.95)',
            }}
          />
          جارٍ المعالجة...
        </span>
      ) : children}
    </button>
  )
}

// ── AuthDivider ───────────────────────────────────────────────────────────────
// Gradient hairline divider with centered label.

export function AuthDivider({ label = 'أو' }) {
  return (
    <div className="flex items-center gap-4 my-5">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to left, ${T.border}, transparent)` }} />
      <span className="text-[11px] font-semibold tracking-wide" style={{ color: T.textMuted }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${T.border}, transparent)` }} />
    </div>
  )
}

// ── TrustBar ──────────────────────────────────────────────────────────────────
// Glass pill, legible over any background: dark artwork or white card.

export function TrustBar({ delay = 0.34 }) {
  return (
    <motion.div
      {...fu(delay)}
      className="flex items-center justify-center mt-4"
    >
      <div
        className="flex items-center gap-5 px-5 py-2.5 rounded-full"
        style={{
          background:           'rgba(255,255,255,0.88)',
          backdropFilter:       'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border:               '1px solid rgba(255,255,255,0.50)',
          boxShadow:            '0 4px 16px rgba(0,0,0,0.12)',
        }}
      >
        {[
          { Icon: Lock,        label: 'تشفير SSL'     },
          { Icon: CircleCheck, label: 'موثوق ومعتمد'  },
          { Icon: Star,        label: '٤.٩ / ٥ تقييم' },
        ].map(({ Icon, label }, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 font-medium"
            style={{ fontSize: '11px', color: T.textMuted }}
          >
            <Icon size={10} strokeWidth={2.2} />
            {label}
          </span>
        ))}
      </div>
    </motion.div>
  )
}
