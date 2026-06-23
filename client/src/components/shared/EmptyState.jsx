export default function EmptyState({ icon, title, description, action, variant = 'light', dark = false }) {
  const isDark = variant === 'dark' || dark

  const actionEl = action && typeof action === 'object' && action.label ? (
    <button onClick={action.onClick} className={isDark ? 'btn-gold text-sm px-5 py-2.5' : 'btn-purple text-sm px-5 py-2.5'}>
      {action.label}
    </button>
  ) : action

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-white/5' : 'bg-[#f3eefc]'}`}>
          <span className={isDark ? 'text-brand-gold opacity-70' : 'text-brand-purple opacity-60'}>{icon}</span>
        </div>
      )}
      <h3 className={`font-heading font-bold text-lg mb-2 ${isDark ? 'text-white/80' : 'text-brand-textBody'}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-sm max-w-sm ${isDark ? 'text-brand-textMuted' : 'text-[#9b7fd6]'}`}>
          {description}
        </p>
      )}
      {actionEl && <div className="mt-5">{actionEl}</div>}
    </div>
  )
}
