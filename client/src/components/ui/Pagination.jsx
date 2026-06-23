export default function Pagination({ page, pages, total, onPageChange, className = '' }) {
  if (pages <= 1) return null

  const getPages = () => {
    const arr = []
    const delta = 2
    const left = Math.max(1, page - delta)
    const right = Math.min(pages, page + delta)

    if (left > 1) { arr.push(1); if (left > 2) arr.push('...') }
    for (let i = left; i <= right; i++) arr.push(i)
    if (right < pages) { if (right < pages - 1) arr.push('...'); arr.push(pages) }
    return arr
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} dir="rtl">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#e8e0f5] text-brand-textBody hover:bg-[#f0ecf8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      </button>

      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-[#9b7fd6] text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
              p === page
                ? 'bg-purple-gradient text-white shadow-purple-sm'
                : 'border border-[#e8e0f5] text-brand-textBody hover:bg-[#f0ecf8]'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === pages}
        className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#e8e0f5] text-brand-textBody hover:bg-[#f0ecf8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      </button>

      {total !== undefined && (
        <span className="text-sm text-[#9b7fd6] mr-2">إجمالي: {total}</span>
      )}
    </div>
  )
}
