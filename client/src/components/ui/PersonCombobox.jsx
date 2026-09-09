import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api.js'
import Avatar from './Avatar.jsx'
import { getFileUrl } from '../../config/constants.js'

let uid = 0
function useStableId(prefix) {
  const ref = useRef(null)
  if (!ref.current) ref.current = `${prefix}-${++uid}`
  return ref.current
}

// 350ms: long enough that normal typing doesn't fire a request per
// keystroke, short enough to still feel instant once the admin pauses.
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

/**
 * Searchable, accessible, RTL-safe single-select combobox for picking a
 * teacher or student out of a large list — replaces the native
 * `<select>`/`<option>` pattern that becomes unusable once there are more
 * than a handful of names (no search, no distinguishing context between
 * two people with the same first name, inconsistent popup styling across
 * browsers). Same interaction pattern as TeachingSubjectCombobox.jsx (the
 * established combobox convention in this codebase) — keyboard nav,
 * loading/empty/error states — generalized to the real `/admin/teachers`
 * and `/admin/students` search endpoints instead of the teaching-subject
 * catalog.
 *
 * value/onChange carry the person's `_id` (or null). `excludeId` hides one
 * id from the results (e.g. a "target teacher" picker excluding whoever is
 * already chosen as "source"). `extraParams` is forwarded to the list
 * query (e.g. `{ status: 'active' }`) for a producer that needs a narrower
 * pool than "every teacher/student".
 */
export default function PersonCombobox({
  role, // 'teacher' | 'student'
  value,
  onChange,
  label,
  placeholder,
  required = false,
  disabled = false,
  error,
  excludeId,
  extraParams,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const listboxId = useStableId(`${role}-listbox`)
  const inputId = useStableId(`${role}-combobox`)
  const debouncedQuery = useDebouncedValue(query, 350)

  const resource = role === 'teacher' ? 'teachers' : 'students'

  // The currently-selected person may not be present in the current
  // (possibly filtered/paginated) search results, so it's fetched by id
  // independently — this is also what lets the input show a real name
  // immediately when the combobox mounts with an existing value (e.g.
  // editing an already-assigned relationship).
  const { data: selectedPerson } = useQuery({
    queryKey: ['admin', resource, 'by-id', value],
    queryFn: () => api.get(`/admin/${resource}/${value}`).then((r) => r.data.data?.teacher || r.data.data?.student || r.data.data),
    enabled: !!value,
    staleTime: 60_000,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', resource, 'combobox-search', debouncedQuery, extraParams],
    queryFn: () => api.get(`/admin/${resource}`, { params: { search: debouncedQuery, limit: 20, ...extraParams } }).then((r) => r.data.data || []),
    enabled: open,
    placeholderData: (prev) => prev,
  })
  const results = (Array.isArray(data) ? data : []).filter((p) => p._id !== excludeId)

  useEffect(() => {
    if (!open) setQuery(selectedPerson ? `${selectedPerson.firstNameAr || ''} ${selectedPerson.lastNameAr || ''}`.trim() : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPerson?._id, selectedPerson?.firstNameAr, selectedPerson?.lastNameAr, open])

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { setHighlighted(0) }, [debouncedQuery, open])

  function select(person) {
    onChange(person._id)
    setQuery(`${person.firstNameAr || ''} ${person.lastNameAr || ''}`.trim())
    setOpen(false)
    inputRef.current?.blur()
  }

  function clear(e) {
    e.stopPropagation()
    onChange(null)
    setQuery('')
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setHighlighted((h) => Math.min(h + 1, results.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      const person = results[highlighted]
      if (person) select(person)
    }
  }

  const activeDescendant = open && results.length ? `${listboxId}-opt-${results[highlighted]?._id}` : undefined
  const defaultPlaceholder = role === 'teacher' ? 'ابحث عن معلم بالاسم أو البريد...' : 'ابحث عن طالب بالاسم أو البريد...'

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-gray-500 mb-1 block">
          {label}{required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          aria-required={required}
          aria-invalid={!!error}
          disabled={disabled}
          className={`w-full min-h-[44px] bg-gray-50 border rounded-xl ps-9 pe-16 text-sm outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
            error ? 'border-red-400' : 'border-gray-200 focus:border-violet-400'
          }`}
          placeholder={placeholder || defaultPlaceholder}
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute end-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button type="button" onClick={clear} aria-label="مسح الاختيار" className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <X size={13} />
            </button>
          )}
          <ChevronDown size={15} className={`text-gray-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {error && <p className="text-xs text-red-600 font-semibold mt-1">{error}</p>}

      {open && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label || defaultPlaceholder}
          className="absolute z-30 mt-1.5 w-full max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1.5"
        >
          {isLoading && (
            <li className="px-3.5 py-3 text-sm text-gray-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> جارٍ البحث...</li>
          )}
          {isError && !isLoading && (
            <li className="px-3.5 py-3 text-sm text-red-500">تعذّر تحميل النتائج</li>
          )}
          {!isLoading && !isError && !results.length && (
            <li className="px-3.5 py-3 text-sm text-gray-500">{debouncedQuery ? 'لا توجد نتائج مطابقة' : 'لا يوجد سجلات'}</li>
          )}
          {results.map((person, i) => (
            <li
              key={person._id}
              id={`${listboxId}-opt-${person._id}`}
              role="option"
              aria-selected={person._id === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(person)}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer ${i === highlighted ? 'bg-violet-50' : ''}`}
            >
              <Avatar src={getFileUrl(person.avatar)} firstName={person.firstNameAr} lastName={person.lastNameAr} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-800 truncate">{person.firstNameAr} {person.lastNameAr}</div>
                <div className="text-xs text-gray-500 truncate">
                  {person.email}
                  {role === 'teacher' && person.specialization ? ` · ${person.specialization}` : ''}
                  {role === 'student' && person.studentType ? ` · ${person.studentType === 'new' ? 'طالب جديد' : 'طالب قديم'}` : ''}
                </div>
              </div>
              {person._id === value && <Check size={14} className="text-violet-600 flex-none" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
