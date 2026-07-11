import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'

/**
 * Accessible, RTL-safe select built on Radix UI — replaces the native
 * <select>/<option> pair whose popup styling can't be reliably controlled
 * across browsers/OSes (source of the "white text on white background" bug).
 *
 * options: [{ value: string, label: string }]
 */
export default function Select({
  value,
  onValueChange,
  options = [],
  placeholder = '—',
  className = '',
  size = 'md',
}) {
  const heights = { sm: 'h-9 text-sm', md: 'h-11 text-base' }

  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange} dir="rtl">
      <RadixSelect.Trigger
        className={`field-light ${heights[size]} w-full flex items-center justify-between gap-2 px-3 cursor-pointer data-[placeholder]:text-[#a59bc2] ${className}`}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown size={16} className="text-[#9b7fd6] flex-none" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className="z-[100] overflow-hidden rounded-2xl border border-[#e8e0f5] bg-white shadow-[0_12px_32px_rgba(80,50,150,0.16)] w-[var(--radix-select-trigger-width)]"
        >
          <RadixSelect.Viewport className="p-1.5 max-h-72">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className="relative flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm text-brand-textBody cursor-pointer select-none outline-none data-[highlighted]:bg-[#f3eefc] data-[state=checked]:bg-[#efe6fd] data-[state=checked]:text-[#6d28d9] data-[state=checked]:font-semibold"
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={14} className="text-[#7c3aed]" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
