const OPTIONS = [
  { value: 'male', label: 'معلم' },
  { value: 'female', label: 'معلمة' },
]

// The one place a teacher's gender is ever chosen in the UI (admin
// create/edit, teacher self-settings). A plain radio-card group rather than
// a free-text field or a silently-defaulted value — nothing here ever
// pre-selects "معلم" for an unresolved teacher.
export default function GenderSegmentedControl({ value, onChange, label = 'تصنيف المعلم', required = false }) {
  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-400 mb-1 block">{label}</label>}
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2">
        {OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`h-10 rounded-xl text-sm font-bold border transition-colors ${
              value === o.value
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-300'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {!value && (
        <p className="text-[11px] text-amber-600 mt-1.5 font-semibold">
          {required ? 'مطلوب — لم يتم تحديد التصنيف بعد' : 'غير محدد حالياً — سيظهر بصورة محايدة حتى يتم تحديده'}
        </p>
      )}
    </div>
  )
}
