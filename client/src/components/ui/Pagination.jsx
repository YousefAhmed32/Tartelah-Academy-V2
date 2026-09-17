export default function Pagination({
  page: pageProp,
  pages: pagesProp,
  total: totalProp,
  onPageChange,
  current,
  onChange,
  totalItems,
  className = '',
}) {
  const activePage = Math.max(1, Number(pageProp ?? current ?? 1))
  const totalPages = Math.max(1, Number(pagesProp !== undefined ? pagesProp : (totalProp ?? 1)))

  if (!totalPages || totalPages <= 1) return null

  const handlePageChange = (targetPage) => {
    const p = Number(targetPage)
    if (isNaN(p) || p < 1 || p > totalPages || p === activePage) return
    if (typeof onPageChange === 'function') {
      onPageChange(p)
    } else if (typeof onChange === 'function') {
      onChange(p)
    }
  }

  const getPages = () => {
    const arr = []
    const delta = 2
    const left = Math.max(1, activePage - delta)
    const right = Math.min(totalPages, activePage + delta)

    if (left > 1) { arr.push(1); if (left > 2) arr.push('...') }
    for (let i = left; i <= right; i++) arr.push(i)
    if (right < totalPages) { if (right < totalPages - 1) arr.push('...'); arr.push(totalPages) }
    return arr
  }

  // If pagesProp was passed, totalProp is item count (Pattern A). Otherwise, display totalItems if supplied.
  const displayTotal = totalItems !== undefined ? totalItems : (pagesProp !== undefined ? totalProp : undefined)

  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`} dir="rtl">
      <button
        type="button"
        onClick={() => handlePageChange(activePage - 1)}
        disabled={activePage <= 1}
        title="الصفحة السابقة"
        aria-label="الصفحة السابقة"
        className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="w-8 h-9 flex items-center justify-center text-gray-400 text-xs tracking-wider">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => handlePageChange(p)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
              p === activePage
                ? 'bg-purple-gradient text-white shadow-purple-sm'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => handlePageChange(activePage + 1)}
        disabled={activePage >= totalPages}
        title="الصفحة التالية"
        aria-label="الصفحة التالية"
        className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      {displayTotal !== undefined && (
        <span className="text-xs font-medium text-gray-500 mr-2">إجمالي: {displayTotal}</span>
      )}
    </div>
  )
}
