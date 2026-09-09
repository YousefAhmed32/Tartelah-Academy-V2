import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X, Check, ChevronDown } from 'lucide-react'

export const DATE_PRESETS = [
  { key: 'today', label: 'اليوم' },
  { key: 'yesterday', label: 'أمس' },
  { key: 'this_week', label: 'هذا الأسبوع' },
  { key: 'this_month', label: 'هذا الشهر' },
  { key: 'last_month', label: 'الشهر السابق' },
  { key: 'custom', label: 'فترة مخصصة' },
]

export default function DateRangePresetPicker({
  value = { preset: 'this_month', startDate: '', endDate: '' },
  onChange,
  onReset,
  showReset = true,
  className = '',
}) {
  const activePreset = value?.preset || 'this_month'
  const [customStart, setCustomStart] = useState(value?.startDate || '')
  const [customEnd, setCustomEnd] = useState(value?.endDate || '')

  useEffect(() => {
    if (value?.startDate) setCustomStart(value.startDate)
    if (value?.endDate) setCustomEnd(value.endDate)
  }, [value?.startDate, value?.endDate])

  const handleSelectPreset = (key) => {
    if (key === 'custom') {
      onChange?.({
        preset: 'custom',
        startDate: customStart,
        endDate: customEnd,
      })
    } else {
      onChange?.({
        preset: key,
        startDate: '',
        endDate: '',
      })
    }
  }

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return
    onChange?.({
      preset: 'custom',
      startDate: customStart,
      endDate: customEnd,
    })
  }

  const handleReset = () => {
    setCustomStart('')
    setCustomEnd('')
    if (onReset) {
      onReset()
    } else {
      onChange?.({
        preset: 'this_month',
        startDate: '',
        endDate: '',
      })
    }
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Preset buttons bar */}
      <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-[#f5f2fa] rounded-2xl border border-[#ece4f5]/80">
        <div className="flex items-center gap-1 text-[#7c6aaa] px-2 text-xs font-semibold select-none flex-none">
          <Calendar size={14} className="text-brand-purple" />
          <span className="hidden sm:inline">الفترة:</span>
        </div>

        <div className="flex items-center gap-1 flex-wrap flex-1">
          {DATE_PRESETS.map((p) => {
            const isActive = activePreset === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => handleSelectPreset(p.key)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all select-none min-h-[36px] flex items-center justify-center ${
                  isActive
                    ? 'text-brand-purple'
                    : 'text-[#5d4a82] hover:text-[#1f1147] hover:bg-white/60'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="datePresetPill"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-[#e8dff5]"
                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                  />
                )}
                <span className="relative z-10">{p.label}</span>
              </button>
            )
          })}
        </div>

        {showReset && activePreset !== 'this_month' && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#8b7aab] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ms-auto"
            title="إعادة ضبط الفترة للشهر الحالي"
          >
            <X size={13} />
            <span className="hidden md:inline">استعادة الافتراضي</span>
          </button>
        )}
      </div>

      {/* Expandable Custom Date Range Picker */}
      <AnimatePresence>
        {activePreset === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-3 border border-[#e8dff5] shadow-sm flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#5d4a82]">من:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-9 px-3 bg-[#faf8fc] border border-[#dcd1ed] rounded-xl text-xs font-semibold text-[#1f1147] outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#5d4a82]">إلى:</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-9 px-3 bg-[#faf8fc] border border-[#dcd1ed] rounded-xl text-xs font-semibold text-[#1f1147] outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!customStart || !customEnd}
                className="flex items-center gap-1 px-4 py-2 bg-brand-purple hover:bg-[#6b21a8] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-brand-purple/20"
              >
                <Check size={13} />
                تطبيق الفترة
              </button>

              {customStart && customEnd && (
                <span className="text-[11px] text-[#7c6aaa] font-body ms-auto">
                  من {customStart} إلى {customEnd}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
