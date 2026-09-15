import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, X, User, GraduationCap, ArrowLeft, Loader2 } from 'lucide-react'
import api from '../../utils/api.js'
import Avatar from '../ui/Avatar.jsx'
import { ROUTES, getFileUrl } from '../../config/constants.js'

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function DashboardProfileSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'students' | 'teachers'
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const debouncedQuery = useDebounce(query.trim(), 280)

  // Fetch students if filter is 'all' or 'students'
  const shouldFetchStudents = isOpen && (filterType === 'all' || filterType === 'students') && debouncedQuery.length >= 1
  const { data: students = [], isFetching: isStudentsFetching } = useQuery({
    queryKey: ['admin', 'dashboard-search-students', debouncedQuery],
    queryFn: () =>
      api
        .get('/admin/students', { params: { search: debouncedQuery, limit: 6 } })
        .then((r) => r.data.data || []),
    enabled: shouldFetchStudents,
    staleTime: 30_000,
  })

  // Fetch teachers if filter is 'all' or 'teachers'
  const shouldFetchTeachers = isOpen && (filterType === 'all' || filterType === 'teachers') && debouncedQuery.length >= 1
  const { data: teachers = [], isFetching: isTeachersFetching } = useQuery({
    queryKey: ['admin', 'dashboard-search-teachers', debouncedQuery],
    queryFn: () =>
      api
        .get('/admin/teachers', { params: { search: debouncedQuery, limit: 6 } })
        .then((r) => r.data.data || []),
    enabled: shouldFetchTeachers,
    staleTime: 30_000,
  })

  const isLoading = (shouldFetchStudents && isStudentsFetching) || (shouldFetchTeachers && isTeachersFetching)

  // Merge and tag results
  const taggedStudents = (Array.isArray(students) ? students : []).map((s) => ({ ...s, searchRole: 'student' }))
  const taggedTeachers = (Array.isArray(teachers) ? teachers : []).map((t) => ({ ...t, searchRole: 'teacher' }))

  const combinedResults =
    filterType === 'students'
      ? taggedStudents
      : filterType === 'teachers'
      ? taggedTeachers
      : [...taggedStudents, ...taggedTeachers]

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset highlight on query change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [debouncedQuery, filterType])

  const handleSelect = (person) => {
    if (!person?._id) return
    setIsOpen(false)
    setQuery('')
    if (person.searchRole === 'teacher') {
      navigate(ROUTES.ADMIN_TEACHER_PROFILE.replace(':id', person._id))
    } else {
      navigate(ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', person._id))
    }
  }

  const handleKeyDown = (e) => {
    if (!isOpen || combinedResults.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1) % combinedResults.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev - 1 + combinedResults.length) % combinedResults.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (combinedResults[highlightedIndex]) {
        handleSelect(combinedResults[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 rounded-2xl bg-white border border-gray-200/90 shadow-sm focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all">
        {/* Search Input */}
        <div className="flex-1 flex items-center gap-2.5 px-2">
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-violet-600 animate-spin flex-none" />
          ) : (
            <Search className="w-5 h-5 text-gray-400 flex-none" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="ابحث أو اختر اسم طالب أو معلم لفتح ملفه الشخصي مباشرة..."
            className="w-full bg-transparent text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none"
            dir="rtl"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-none"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100 flex-none self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              filterType === 'all'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setFilterType('students')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              filterType === 'students'
                ? 'bg-white text-violet-700 shadow-sm border border-violet-100'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-violet-600" />
            الطلاب
          </button>
          <button
            type="button"
            onClick={() => setFilterType('teachers')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              filterType === 'teachers'
                ? 'bg-white text-amber-700 shadow-sm border border-amber-200'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <User className="w-3.5 h-3.5 text-amber-600" />
            المعلمون
          </button>
        </div>
      </div>

      {/* Floating Results Dropdown */}
      {isOpen && query.trim().length >= 1 && (
        <div className="absolute top-full start-0 end-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden divide-y divide-gray-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[380px] overflow-y-auto">
          {/* Header */}
          <div className="px-4 py-2.5 bg-gray-50/70 flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>نتائج البحث عن: «{query.trim()}»</span>
            <span>{combinedResults.length} نتيجة</span>
          </div>

          {/* Results List */}
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
              <span className="text-xs font-medium">جاري البحث في قاعدة البيانات...</span>
            </div>
          ) : combinedResults.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">لم يتم العثور على نتائج</p>
              <p className="text-xs text-gray-400 mt-1">تأكد من كتابة الاسم بشكل صحيح أو اختر تصفية أخرى</p>
            </div>
          ) : (
            combinedResults.map((person, index) => {
              const isTeacher = person.searchRole === 'teacher'
              const isHighlighted = index === highlightedIndex
              return (
                <div
                  key={person._id}
                  onClick={() => handleSelect(person)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`flex items-center justify-between gap-3 p-3.5 cursor-pointer transition-colors ${
                    isHighlighted ? 'bg-violet-50/60' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={getFileUrl(person.avatar)}
                      firstName={person.firstNameAr}
                      lastName={person.lastNameAr}
                      size="sm"
                      className={isTeacher ? 'ring-2 ring-amber-400/30' : 'ring-2 ring-violet-400/30'}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-sm text-gray-900 truncate">
                          {person.firstNameAr} {person.lastNameAr}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex-none ${
                            isTeacher
                              ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                              : 'bg-violet-50 text-violet-700 border border-violet-200/60'
                          }`}
                        >
                          {isTeacher ? 'معلم' : 'طالب'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-2">
                        {person.email && <span>{person.email}</span>}
                        {person.phone && (
                          <>
                            <span>•</span>
                            <span dir="ltr">{person.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-none">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 ${
                        isHighlighted
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-gray-400 group-hover:text-gray-600'
                      }`}
                    >
                      <span>فتح الملف</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
