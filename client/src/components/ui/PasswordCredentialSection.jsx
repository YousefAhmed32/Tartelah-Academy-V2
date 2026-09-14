import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KeyRound, Wand2, Building2 } from 'lucide-react'
import Input from './Input.jsx'
import { credentialDefaultsService } from '../../services/credentialDefaults.service.js'

// "تسجيل الدخول وكلمة المرور" — Phase 2 Part 2 §1–§2, extended by the Phase 2
// meeting addendum §1 into three modes. Used by the teacher-and-students
// onboarding wizard, the "Add student" flow, the standalone student-creation
// form, and standalone teacher creation — one shared component so validation
// feedback and copy never drift between call sites.
//
// `value` shape: { mode: 'academy_default'|'auto'|'manual', password, passwordConfirm, requirePasswordChange }
// `role` ('student'|'teacher') is REQUIRED — it determines which academy
// default (if any) this picker offers. The backend re-validates everything
// here again — this component only gives immediate feedback and resolves
// nothing itself; it never sends a password for 'academy_default' mode, only
// the mode string — the server resolves the protected value authoritatively.
//
// For a multi-student onboarding run where each student is a fresh form
// (Phase 2 addendum §1's "apply consistently without retyping the password
// for every student"), pass a `resetKey` that changes with every new student
// (e.g. how many have been saved so far) as this component's React `key` —
// remounting is what correctly resets the "has the admin made an explicit
// choice for THIS student yet" flag below without any fragile heuristic.
export default function PasswordCredentialSection({ value, onChange, role, compact = false }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const mode = value.mode || 'manual'
  const touchedRef = useRef(false)

  const { data: availability } = useQuery({
    queryKey: ['credentialDefaults', 'availability'],
    queryFn: () => credentialDefaultsService.getAvailability().then((r) => r.data.data),
    staleTime: 60_000,
  })
  const defaultAvailable = !!availability?.[role]

  const selectMode = (nextMode) => {
    touchedRef.current = true
    set({
      mode: nextMode,
      password: '', passwordConfirm: '',
      requirePasswordChange: nextMode === 'auto',
    })
  }

  const passwordTooShort = mode === 'manual' && value.password && value.password.length < 8
  const passwordWeak = mode === 'manual' && value.password && value.password.length >= 8 && !/[A-Za-z]/.test(value.password)
  const mismatch = mode === 'manual' && value.passwordConfirm && value.password !== value.passwordConfirm

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
        <KeyRound size={13} /> تسجيل الدخول وكلمة المرور
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => selectMode('manual')}
          className={`h-10 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'manual' ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
          }`}
        >
          <KeyRound size={13} /> كلمة مرور يدوية
        </button>
        <button
          type="button"
          onClick={() => defaultAvailable && selectMode('academy_default')}
          disabled={!defaultAvailable}
          title={defaultAvailable ? undefined : 'لم يتم إعداد كلمة مرور افتراضية لهذا الدور بعد — يمكن إعدادها من إعدادات الأكاديمية'}
          className={`h-10 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
            !defaultAvailable ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
              : mode === 'academy_default' ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
          }`}
        >
          <Building2 size={13} /> كلمة مرور الأكاديمية
        </button>
        <button
          type="button"
          onClick={() => selectMode('auto')}
          className={`h-10 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'auto' ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
          }`}
        >
          <Wand2 size={13} /> إنشاء تلقائي
        </button>
      </div>

      {mode === 'academy_default' && (
        <div className="p-3 bg-violet-50/70 border border-violet-100 rounded-xl text-xs text-violet-800 leading-relaxed space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Building2 size={14} className="text-violet-600" />
            سيتم استخدام كلمة المرور الموحدة المعتمدة للأكاديمية
          </div>
          <p className="text-[11px] text-gray-600">
            يمكنك الاطلاع على كلمة المرور الموحدة أو تعديلها من إعدادات الأكاديمية. الحساب سيُنشأ بهذه الكلمة فوراً.
          </p>
        </div>
      )}
      {mode === 'auto' && (
        <p className="text-[11px] text-gray-400 leading-relaxed">
          سيُنشئ النظام كلمة مرور مؤقتة قوية تلقائيًا وتُعرض مرة واحدة فقط بعد الإنشاء. سيُطلب تغييرها عند أول تسجيل دخول.
        </p>
      )}
      {mode === 'manual' && (
        <div className="space-y-2">
          <Input
            label="كلمة المرور" variant="light" type="password"
            value={value.password || ''} onChange={(e) => { touchedRef.current = true; set({ password: e.target.value }) }}
            error={passwordTooShort ? 'يجب أن تكون 8 أحرف على الأقل' : passwordWeak ? 'يجب أن تحتوي على حرف ورقم على الأقل' : undefined}
            autoComplete="new-password"
          />
          <Input
            label="تأكيد كلمة المرور" variant="light" type="password"
            value={value.passwordConfirm || ''} onChange={(e) => { touchedRef.current = true; set({ passwordConfirm: e.target.value }) }}
            error={mismatch ? 'كلمتا المرور غير متطابقتين' : undefined}
            autoComplete="new-password"
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-gray-600 font-semibold cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.requirePasswordChange === true}
          onChange={(e) => { touchedRef.current = true; set({ requirePasswordChange: e.target.checked }) }}
          disabled={mode === 'auto'}
          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-400 disabled:opacity-50"
        />
        مطالبة بتغيير كلمة المرور عند أول تسجيل دخول
        {mode === 'auto' && <span className="text-gray-400 font-normal">(مفعّلة دائمًا مع الإنشاء التلقائي)</span>}
      </label>
    </div>
  )
}

/** Pure client-side check mirroring the backend's passwordPolicy — used to
 * gate "Next"/"Submit" without a round-trip; the backend re-validates
 * regardless. Returns an Arabic error string, or null when valid. */
export function validateCredentialValue(value) {
  const mode = value?.mode || 'auto'
  if (mode === 'auto' || mode === 'academy_default') return null
  const pw = value.password || ''
  if (pw.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'يجب أن تحتوي كلمة المرور على حرف ورقم على الأقل'
  if (pw !== value.passwordConfirm) return 'كلمتا المرور غير متطابقتين'
  return null
}

export function emptyCredential() {
  return { mode: 'manual', password: '', passwordConfirm: '', requirePasswordChange: false }
}

/** Builds the exact `credential` object the backend API expects — never
 * includes the raw password fields for auto/academy_default modes. */
export function credentialPayload(value) {
  if (!value || value.mode === 'auto') return { mode: 'auto' }
  if (value.mode === 'academy_default') return { mode: 'academy_default', requirePasswordChange: value.requirePasswordChange === true }
  return { mode: 'manual', password: value.password, passwordConfirm: value.passwordConfirm, requirePasswordChange: value.requirePasswordChange === true }
}
