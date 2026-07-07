import { useRef } from 'react'
import { Mail, Phone, MessageCircle, Check } from 'lucide-react'

const OPTIONS = [
  { value: 'email', label: 'البريد الإلكتروني', Icon: Mail },
  { value: 'phone', label: 'الهاتف', Icon: Phone },
  { value: 'whatsapp', label: 'واتساب', Icon: MessageCircle },
]

export default function PreferredContactSelector({ value, onChange }) {
  const btnRefs = useRef([])

  function handleKeyDown(e, index) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    // RTL layout: "next" (right-to-left reading direction) is ArrowLeft.
    const dir = e.key === 'ArrowLeft' ? 1 : -1
    const next = (index + dir + OPTIONS.length) % OPTIONS.length
    onChange(OPTIONS[next].value)
    btnRefs.current[next]?.focus()
  }

  return (
    <div>
      <span className="mb-2.5 block text-sm font-semibold text-brand-textBody">طريقة التواصل المفضلة</span>
      <div role="radiogroup" aria-label="طريقة التواصل المفضلة" className="grid grid-cols-3 gap-3">
        {OPTIONS.map(({ value: v, label, Icon }, i) => {
          const selected = value === v
          return (
            <button
              key={v}
              ref={(el) => { btnRefs.current[i] = el }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(v)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`
                relative flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-all duration-200
                ${selected
                  ? 'border-brand-purple bg-[#F2ECFA] shadow-[0_0_0_3px_rgba(109,52,214,0.12)]'
                  : 'border-[#e8e0f5] bg-white hover:border-brand-purple/40 hover:bg-[#FCFBFE]'}
              `}
            >
              {selected && (
                <span className="absolute -top-2 -end-2 grid h-5 w-5 place-items-center rounded-full bg-brand-purple text-white">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
              <Icon size={20} strokeWidth={1.8} className={selected ? 'text-brand-purple' : 'text-gray-400'} />
              <span className={`text-[13px] font-semibold ${selected ? 'text-brand-purple' : 'text-gray-500'}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
