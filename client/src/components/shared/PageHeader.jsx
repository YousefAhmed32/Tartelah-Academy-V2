export default function PageHeader({ title, subtitle, actions, variant = 'light' }) {
  const isDark = variant === 'dark'
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className={`font-heading font-bold text-2xl ${isDark ? 'text-white' : 'text-brand-textBody'}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-sm mt-1 ${isDark ? 'text-brand-textMuted' : 'text-[#9b7fd6]'}`}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  )
}
