import { useState } from 'react'
import { Check, Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTeachingSubjects, useCreateTeachingSubject } from '../../hooks/useTeachingSubjects.js'
import { useAuthStore } from '../../store/authStore.js'

// Multi-select toggle group for a teacher's teaching specializations
// (تجويد/حفظ/نظر/عربية/قرآن/أخرى + any admin-created subject) — replaces the
// old single-select "الفئة" dropdown now that a teacher may hold more than
// one specialization. The backend keeps the legacy singular `category` field
// mirrored to specializations[0] automatically, so this is a superset, not a
// breaking change (see server/src/models/User.js).
//
// Options come from the LIVE teaching-subject catalog (see
// hooks/useTeachingSubjects.js), not a frozen frontend array, so a newly
// admin-created subject shows up here immediately after creation.
export default function SpecializationsMultiSelect({ value = [], onChange, label = 'تخصصات التدريس', required = false }) {
  const { hasPermission } = useAuthStore()
  const canCreate = hasPermission('curricula.manage')
  const { data: subjects = [], isLoading } = useTeachingSubjects()
  const createMutation = useCreateTeachingSubject()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const toggle = (v) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  }

  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed || createMutation.isPending) return
    try {
      const res = await createMutation.mutateAsync({ nameAr: trimmed })
      onChange(value.includes(res.data.key) ? value : [...value, res.data.key])
      toast.success(res.message || 'تم إنشاء المنهج')
      setNewName('')
      setAdding(false)
    } catch (err) {
      // Preserve the typed text on a recoverable error so the admin doesn't
      // lose their input.
      toast.error(err?.response?.data?.message || 'تعذّر إنشاء المنهج')
    }
  }

  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-400 mb-1 block">{label}</label>}
      <div role="group" aria-label={label} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {isLoading && <div className="col-span-full text-xs text-gray-400 flex items-center gap-2 py-2"><Loader2 size={13} className="animate-spin" /> جارٍ التحميل...</div>}
        {subjects.map((o) => {
          const active = value.includes(o.key)
          return (
            <button
              key={o.key}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(o.key)}
              className={`min-h-[44px] rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-1.5 px-2 ${
                active
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
              }`}
            >
              {active && <Check size={14} className="flex-none" />}
              <span className="truncate">{o.nameAr}</span>
            </button>
          )
        })}
        {canCreate && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="min-h-[44px] rounded-xl text-sm font-bold border border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 flex items-center justify-center gap-1.5 px-2"
          >
            <Plus size={14} /> منهج جديد
          </button>
        )}
      </div>
      {adding && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            autoFocus
            aria-label="اسم المنهج الجديد بالعربية"
            className="flex-1 min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl px-3 text-sm outline-none focus:border-violet-400"
            placeholder="اسم المنهج الجديد بالعربية"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
          />
          <button type="button" onClick={handleCreate} disabled={createMutation.isPending || !newName.trim()}
            className="min-h-[44px] px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-60 flex items-center gap-1.5">
            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} إضافة
          </button>
          <button type="button" onClick={() => { setAdding(false); setNewName('') }}
            className="min-h-[44px] px-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold">
            إلغاء
          </button>
        </div>
      )}
      {required && !value.length && (
        <p className="text-[11px] text-amber-600 mt-1.5 font-semibold">مطلوب — اختر تخصصًا واحدًا على الأقل</p>
      )}
    </div>
  )
}
