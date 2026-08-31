import { KeyRound, Wand2 } from 'lucide-react'
import Input from './Input.jsx'

// "تسجيل الدخول وكلمة المرور" — Phase 2 Part 2 §1–§2. Exactly two supported
// modes (no academy-wide/shared password exists): automatic secure
// generation, or an administrator-typed initial password. Used by the
// teacher-and-students onboarding wizard, the "Add student" flow, and the
// standalone student-creation form — one shared component so validation
// feedback and copy never drift between call sites.
//
// `value` shape: { mode: 'auto'|'manual', password, passwordConfirm, requirePasswordChange }
// The backend re-validates everything here again — this component only
// gives immediate feedback; it is never the actual security boundary.
export default function PasswordCredentialSection({ value, onChange, compact = false }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const mode = value.mode || 'auto'

  const passwordTooShort = mode === 'manual' && value.password && value.password.length < 8
  const passwordWeak = mode === 'manual' && value.password && value.password.length >= 8 && !/[A-Za-z]/.test(value.password)
  const mismatch = mode === 'manual' && value.passwordConfirm && value.password !== value.passwordConfirm

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
        <KeyRound size={13} /> تسجيل الدخول وكلمة المرور
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => set({ mode: 'auto', password: '', passwordConfirm: '' })}
          className={`h-10 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'auto' ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
          }`}
        >
          <Wand2 size={13} /> إنشاء تلقائي آمن
        </button>
        <button
          type="button"
          onClick={() => set({ mode: 'manual' })}
          className={`h-10 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
            mode === 'manual' ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
          }`}
        >
          <KeyRound size={13} /> كلمة مرور يدوية
        </button>
      </div>

      {mode === 'auto' ? (
        <p className="text-[11px] text-gray-400 leading-relaxed">
          سيُنشئ النظام كلمة مرور مؤقتة قوية تلقائيًا وتُعرض مرة واحدة فقط بعد الإنشاء. سيُطلب تغييرها عند أول تسجيل دخول.
        </p>
      ) : (
        <div className="space-y-2">
          <Input
            label="كلمة المرور" variant="light" type="password"
            value={value.password || ''} onChange={(e) => set({ password: e.target.value })}
            error={passwordTooShort ? 'يجب أن تكون 8 أحرف على الأقل' : passwordWeak ? 'يجب أن تحتوي على حرف ورقم على الأقل' : undefined}
            autoComplete="new-password"
          />
          <Input
            label="تأكيد كلمة المرور" variant="light" type="password"
            value={value.passwordConfirm || ''} onChange={(e) => set({ passwordConfirm: e.target.value })}
            error={mismatch ? 'كلمتا المرور غير متطابقتين' : undefined}
            autoComplete="new-password"
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-gray-600 font-semibold cursor-pointer select-none">
        <input
          type="checkbox"
          checked={value.requirePasswordChange !== false}
          onChange={(e) => set({ requirePasswordChange: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-400"
        />
        مطالبة بتغيير كلمة المرور عند أول تسجيل دخول (موصى به)
      </label>
    </div>
  )
}

/** Pure client-side check mirroring the backend's passwordPolicy — used to
 * gate "Next"/"Submit" without a round-trip; the backend re-validates
 * regardless. Returns an Arabic error string, or null when valid. */
export function validateCredentialValue(value) {
  const mode = value?.mode || 'auto'
  if (mode === 'auto') return null
  const pw = value.password || ''
  if (pw.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'يجب أن تحتوي كلمة المرور على حرف ورقم على الأقل'
  if (pw !== value.passwordConfirm) return 'كلمتا المرور غير متطابقتين'
  return null
}

export function emptyCredential() {
  return { mode: 'auto', password: '', passwordConfirm: '', requirePasswordChange: true }
}

/** Builds the exact `credential` object the backend API expects — never
 * includes the raw password fields for auto mode. */
export function credentialPayload(value) {
  if (!value || value.mode !== 'manual') return { mode: 'auto' }
  return { mode: 'manual', password: value.password, passwordConfirm: value.passwordConfirm, requirePasswordChange: value.requirePasswordChange !== false }
}
