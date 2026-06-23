import { forwardRef, useState } from 'react'

const Input = forwardRef(function Input({
  label,
  error,
  hint,
  icon,
  iconEnd,
  type = 'text',
  variant = 'dark',
  className = '',
  containerClass = '',
  onIconEndClick,
  ...props
}, ref) {
  const [showPass, setShowPass] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPass ? 'text' : 'password') : type

  const fieldClass = variant === 'light' ? 'field-light' : 'field'

  return (
    <div className={`flex flex-col gap-1.5 ${containerClass}`}>
      {label && (
        <label className={`text-sm font-semibold ${variant === 'light' ? 'text-brand-textBody' : 'text-[#cdbef0]'}`}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute top-1/2 -translate-y-1/2 end-4 pointer-events-none text-[#9888bd]">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type={inputType}
          className={`
            ${fieldClass}
            ${icon ? 'pe-12' : ''}
            ${(iconEnd || isPassword) ? 'ps-12' : ''}
            ${error ? '!border-red-400 focus:!shadow-[0_0_0_4px_rgba(239,68,68,0.15)]' : ''}
            ${className}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute top-1/2 -translate-y-1/2 start-4 text-[#9888bd] hover:text-white transition-colors"
          >
            {showPass ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.08 10.08 0 0 1 12 20C7 20 2.73 16.39 1 12a10.06 10.06 0 0 1 2.91-4.63M9.9 4.24A9.12 9.12 0 0 1 12 4c5 0 9.27 3.61 11 8a10.07 10.07 0 0 1-1.37 2.74M3 3l18 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12C2.73 7.61 7 4 12 4s9.27 3.61 11 8c-1.73 4.39-6 8-11 8S2.73 16.39 1 12Z" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7"/></svg>
            )}
          </button>
        )}
        {iconEnd && !isPassword && (
          <button
            type="button"
            onClick={onIconEndClick}
            className="absolute top-1/2 -translate-y-1/2 start-4 text-[#9888bd] hover:text-white transition-colors"
          >
            {iconEnd}
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {hint && !error && <p className="text-[#9888bd] text-sm">{hint}</p>}
    </div>
  )
})

export default Input
