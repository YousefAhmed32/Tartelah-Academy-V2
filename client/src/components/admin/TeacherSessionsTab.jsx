import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Calendar, Clock, Plus, Edit2, Trash2, XCircle, Video, CheckCircle2,
  AlertTriangle, Users, RefreshCw, Filter, ChevronDown, ChevronUp, Copy,
  Check, ExternalLink, Sparkles, Search, Layers, User, CalendarClock,
  Phone, Mail, ArrowLeftRight, HelpCircle,
} from 'lucide-react'
import api from '../../utils/api.js'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Spinner from '../ui/Spinner.jsx'
import Modal from '../ui/Modal.jsx'
import ConfirmDialog from '../shared/ConfirmDialog.jsx'
import { formatDateAr, formatTimeAr, getDayNameAr, isToday, isFuture, isPast } from '../../utils/date.js'
import { dayLabel } from '../../utils/assignmentSchedule.js'

const STATUS_MAP = {
  scheduled:    { label: 'مجدولة',   variant: 'purple',  bg: 'bg-violet-50 text-violet-700 border-violet-200' },
  ongoing:      { label: 'جارية الآن', variant: 'blue',    bg: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' },
  completed:    { label: 'مكتملة',   variant: 'success', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:    { label: 'ملغاة',    variant: 'danger',  bg: 'bg-red-50 text-red-700 border-red-200' },
  rescheduled:  { label: 'معاد جدولتها', variant: 'warning', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  missed:       { label: 'بحاجة متابعة', variant: 'warning', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  no_show:      { label: 'غياب',     variant: 'gray',    bg: 'bg-gray-100 text-gray-700 border-gray-200' },
}

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-400'
const selectCls = `${inputCls} cursor-pointer`

export default function TeacherSessionsTab({
  teacherId,
  teacher,
  students = [],
  workingHours,
  scheduleRules = [],
  onSyncLinks,
}) {
  const qc = useQueryClient()
  const [viewMode, setViewMode] = useState('timeline') // 'timeline' | 'students' | 'availability'
  const [statusFilter, setStatusFilter] = useState('all')
  const [studentFilter, setStudentFilter] = useState('all')
  const [dateRangeFilter, setDateRangeFilter] = useState('all') // 'all' | 'today' | 'week' | 'month'
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [sessionModal, setSessionModal] = useState({ open: false, session: null, prefilledStudentId: '' })
  const [cancelModal, setCancelModal] = useState({ open: false, session: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, session: null })
  const [copiedLink, setCopiedLink] = useState('')

  // Fetch all sessions for this teacher
  const { data: sessionsRes, isLoading: isSessionsLoading, isFetching: isSessionsFetching, refetch: refetchSessions } = useQuery({
    queryKey: ['admin', 'teacher-sessions', teacherId, statusFilter, studentFilter, dateRangeFilter],
    queryFn: () => {
      const params = {
        teacherId,
        limit: 150,
        sortOrder: 'asc',
      }
      if (statusFilter !== 'all') params.status = statusFilter
      if (studentFilter !== 'all') params.studentId = studentFilter
      if (dateRangeFilter === 'today') {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const end = new Date()
        end.setHours(23, 59, 59, 999)
        params.dateFrom = start.toISOString()
        params.dateTo = end.toISOString()
      } else if (dateRangeFilter === 'week') {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const end = new Date()
        end.setDate(end.getDate() + 7)
        params.dateFrom = start.toISOString()
        params.dateTo = end.toISOString()
      } else if (dateRangeFilter === 'month') {
        const start = new Date()
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setMonth(end.getMonth() + 1)
        params.dateFrom = start.toISOString()
        params.dateTo = end.toISOString()
      }
      return api.get('/admin/sessions', { params }).then(r => r.data)
    },
    staleTime: 30_000,
  })

  // Fetch teacher availability slots
  const { data: availabilityData, isLoading: isAvailLoading } = useQuery({
    queryKey: ['admin', 'teacher-availability', teacherId],
    queryFn: () => api.get(`/admin/teachers/${teacherId}/availability`, { params: { durationMinutes: 60 } }).then(r => r.data.data),
    staleTime: 60_000,
  })

  // Fetch active schedule rules
  const { data: rulesRes, refetch: refetchRules } = useQuery({
    queryKey: ['admin', 'teacher-schedule-rules', teacherId],
    queryFn: () => api.get('/admin/schedule-rules', { params: { teacherId, limit: 100 } }).then(r => r.data),
    staleTime: 60_000,
  })

  const sessions = sessionsRes?.data || []
  const activeRules = rulesRes?.data || scheduleRules || []

  // Normalized assigned students list
  const assignedStudentsList = useMemo(() => {
    const map = new Map()
    students.forEach((entry) => {
      const s = entry.student || entry
      if (s?._id) map.set(String(s._id), { ...s, subscription: entry })
    })
    // Also include any students found in schedule rules
    activeRules.forEach((rule) => {
      const s = rule.studentId
      if (s?._id && !map.has(String(s._id))) {
        map.set(String(s._id), { ...s, subscription: null })
      }
    })
    return Array.from(map.values())
  }, [students, activeRules])

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const studentName = `${s.studentId?.firstNameAr || ''} ${s.studentId?.lastNameAr || ''}`.toLowerCase()
        const title = (s.titleAr || '').toLowerCase()
        if (!studentName.includes(q) && !title.includes(q)) return false
      }
      return true
    })
  }, [sessions, searchQuery])

  // Calculations for KPI cards
  const now = new Date()
  const upcomingCount = sessions.filter(s => new Date(s.scheduledAt) >= now && s.status === 'scheduled').length
  const completedCount = sessions.filter(s => s.status === 'completed').length
  const activeStudentsInSchedule = new Set(sessions.map(s => s.studentId?._id || s.studentId).filter(Boolean)).size

  // Group sessions by day for Timeline View
  const groupedByDay = useMemo(() => {
    const groups = {}
    filteredSessions.forEach((s) => {
      const dateKey = new Date(s.scheduledAt).toISOString().slice(0, 10)
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(s)
    })
    // Sort day groups
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredSessions])

  // Group sessions by student for Student Grouped View
  const groupedByStudent = useMemo(() => {
    const map = new Map()
    // Populate all assigned students
    assignedStudentsList.forEach((st) => {
      map.set(String(st._id), {
        student: st,
        rules: activeRules.filter(r => String(r.studentId?._id || r.studentId) === String(st._id)),
        upcoming: [],
        completed: [],
        other: [],
      })
    })

    // Distribute sessions
    filteredSessions.forEach((s) => {
      const stId = String(s.studentId?._id || s.studentId)
      if (!map.has(stId)) {
        map.set(stId, {
          student: s.studentId || { _id: stId, firstNameAr: 'طالب', lastNameAr: `#${stId.slice(-4)}` },
          rules: activeRules.filter(r => String(r.studentId?._id || r.studentId) === stId),
          upcoming: [],
          completed: [],
          other: [],
        })
      }
      const target = map.get(stId)
      const isUp = new Date(s.scheduledAt) >= now && s.status === 'scheduled'
      if (isUp) target.upcoming.push(s)
      else if (s.status === 'completed') target.completed.push(s)
      else target.other.push(s)
    })

    return Array.from(map.values())
  }, [assignedStudentsList, filteredSessions, activeRules, now])

  const copyToClipboard = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedLink(text)
    toast.success('تم نسخ الرابط')
    setTimeout(() => setCopiedLink(''), 2500)
  }

  const handleDeleteSession = async (sessionId) => {
    try {
      await api.delete(`/admin/sessions/${sessionId}`)
      toast.success('تم حذف الحصة نهائياً')
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-sessions', teacherId] })
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', teacherId] })
      setDeleteModal({ open: false, session: null })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'تعذّر حذف الحصة')
    }
  }

  const handleCancelSession = async (sessionId, reason) => {
    try {
      await api.patch(`/admin/sessions/${sessionId}`, {
        status: 'cancelled',
        notes: reason ? `سبب الإلغاء: ${reason}` : undefined,
      })
      toast.success('تم إلغاء الحصة')
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-sessions', teacherId] })
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', teacherId] })
      setCancelModal({ open: false, session: null })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'تعذّر إلغاء الحصة')
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Teacher General Meeting Link Bar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center flex-none border border-violet-100">
            <Video size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs text-gray-900">الرابط العمومي للاجتماعات:</span>
              {teacher?.meetingLinks?.[0]?.link ? (
                <a
                  href={teacher.meetingLinks[0].link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-600 hover:text-violet-800 font-mono underline truncate max-w-[260px] sm:max-w-[400px]"
                  dir="ltr"
                >
                  {teacher.meetingLinks[0].link}
                </a>
              ) : (
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md">لم يُسجل رابط عمومي بعد (الحصص الجديدة لن تحتوي على رابط تلقائي)</span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {teacher?.meetingLinks?.[0]?.link
                ? 'يُعتمد هذا الرابط كافتراضي تلقائي لكافة الحصص والمحاضرات المنشأة مع هذا المعلم.'
                : 'يمكنك تعيين رابط عمومي موحد لجميع محاضرات وحصص المعلم وتعميمه بضغطة زر واحدة.'}
            </p>
          </div>
        </div>

        {onSyncLinks && (
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={13} className="text-violet-600" />}
            onClick={onSyncLinks}
            className="!text-violet-700 !border-violet-200 hover:!bg-violet-50 flex-none self-start sm:self-auto font-bold"
          >
            {teacher?.meetingLinks?.[0]?.link ? 'تعديل وتعميم الرابط' : 'تعيين وتعميم رابط عمومي'}
          </Button>
        )}
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-violet-600">
            <span className="text-xs font-bold text-gray-500">الحصص القادمة</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
              <CalendarClock size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900">{upcomingCount}</div>
          <p className="text-[11px] text-gray-400">حصص مجدولة مستقبلاً</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold text-gray-500">الحصص المكتملة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900">{completedCount}</div>
          <p className="text-[11px] text-gray-400">حصة منتهية بنجاح</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold text-gray-500">الطلاب في الجدول</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900">
            {activeStudentsInSchedule || assignedStudentsList.length}
          </div>
          <p className="text-[11px] text-gray-400">طلاب لديهم مواعيد</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold text-gray-500">الجداول الدورية</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900">{activeRules.length}</div>
          <p className="text-[11px] text-gray-400">مواعيد أسبوعية ثابتة</p>
        </div>
      </div>

      {/* ── Main Toolbar: Actions & Mode Switcher ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3.5">
          <div className="space-y-0.5">
            <h3 className="font-heading font-bold text-base text-gray-800 flex items-center gap-2">
              <Calendar size={18} className="text-violet-600" />
              إدارة الحصص والجداول والتفرغ
            </h3>
            <p className="text-xs text-gray-500">
              استعراض وتعديل كافة الحصص، متابعة المواعيد مع كل طالب، ومطالعة فترات التفرغ والانشغال
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {onSyncLinks && (
              <Button
                variant="outline"
                size="sm"
                icon={<Video size={13} className="text-violet-600" />}
                onClick={onSyncLinks}
                className="!text-violet-700 !border-violet-200 hover:!bg-violet-50 font-bold"
                title="تعميم وتحديث الرابط لجميع حصص ومحاضرات المعلم"
              >
                تعميم الرابط على الكل
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={13} className={isSessionsFetching ? 'animate-spin' : ''} />}
              onClick={() => { refetchSessions(); refetchRules() }}
              title="تحديث البيانات"
            >
              تحديث
            </Button>
            <Button
              variant="purple"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setSessionModal({ open: true, session: null, prefilledStudentId: '' })}
            >
              إضافة حصة جديدة
            </Button>
          </div>
        </div>

        {/* View Mode Tabs (Timeline vs Per Student vs Weekly Map) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex items-center bg-gray-100/90 p-1 rounded-xl gap-1 self-start">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white text-violet-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock size={14} />
              الخط الزمني للحصص
            </button>
            <button
              type="button"
              onClick={() => setViewMode('students')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'students'
                  ? 'bg-white text-violet-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users size={14} />
              مقسمة حسب كل طالب
            </button>
            <button
              type="button"
              onClick={() => setViewMode('availability')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'availability'
                  ? 'bg-white text-violet-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar size={14} />
              الجدول الأسبوعي والتفرغ
            </button>
          </div>

          {/* Quick Filters for Timeline and List */}
          {viewMode !== 'availability' && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter by Student */}
              <select
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-2.5 text-xs text-gray-700 outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="all">جميع الطلاب ({assignedStudentsList.length})</option>
                {assignedStudentsList.map((st) => (
                  <option key={st._id} value={st._id}>
                    {st.firstNameAr} {st.lastNameAr || ''}
                  </option>
                ))}
              </select>

              {/* Filter by Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-2.5 text-xs text-gray-700 outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="all">جميع الحالات</option>
                <option value="scheduled">مجدولة فقط</option>
                <option value="completed">مكتملة فقط</option>
                <option value="cancelled">ملغاة</option>
                <option value="missed">بحاجة متابعة</option>
              </select>

              {/* Date range filter */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs">
                {[
                  ['all', 'الكل'],
                  ['today', 'اليوم'],
                  ['week', 'هذا الأسبوع'],
                  ['month', 'هذا الشهر'],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setDateRangeFilter(k)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      dateRangeFilter === k ? 'bg-white text-violet-700 shadow-xs' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Field */}
        {viewMode !== 'availability' && (
          <div className="relative">
            <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الطالب أو عنوان الحصة..."
              className="w-full h-9 bg-gray-50 border border-gray-200 rounded-xl pr-9 pl-3 text-xs text-gray-800 outline-none focus:border-violet-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── View 1: Timeline & Consecutive Sessions ── */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {isSessionsLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <Spinner size="lg" color="border-violet-600" />
              <p className="text-xs text-gray-500 mt-2">جارٍ تحميل حصص المعلم...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <CalendarClock size={22} />
              </div>
              <h4 className="font-heading font-bold text-sm text-gray-800">لا توجد حصص مسجلة تطابق الفلترة</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                يمكنك جدولة حصة جديدة لهذا المعلم أو تغيير خيارات التصفية بالأعلى.
              </p>
              <Button
                variant="purple"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setSessionModal({ open: true, session: null, prefilledStudentId: '' })}
              >
                جدولة أول حصة
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByDay.map(([dayStr, daySessions]) => {
                const dateObj = new Date(dayStr)
                const isDayToday = isToday(dateObj)

                return (
                  <div key={dayStr} className="space-y-2.5">
                    {/* Day Header */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        isDayToday
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {isDayToday ? 'اليوم · ' : ''}{getDayNameAr(dateObj)}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {formatDateAr(dateObj)}
                      </span>
                      <div className="h-px bg-gray-100 flex-1" />
                      <span className="text-[11px] text-gray-400 font-bold">
                        {daySessions.length} {daySessions.length === 1 ? 'حصة' : 'حصص'}
                      </span>
                    </div>

                    {/* Sessions Grid for this Day */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {daySessions.map((s) => (
                        <SessionCard
                          key={s._id}
                          session={s}
                          onEdit={() => setSessionModal({ open: true, session: s, prefilledStudentId: '' })}
                          onCancel={() => setCancelModal({ open: true, session: s })}
                          onDelete={() => setDeleteModal({ open: true, session: s })}
                          onCopyLink={copyToClipboard}
                          copiedLink={copiedLink}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── View 2: Grouped by Student ── */}
      {viewMode === 'students' && (
        <div className="space-y-4">
          {groupedByStudent.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center space-y-3">
              <Users size={24} className="text-gray-400 mx-auto" />
              <h4 className="font-heading font-bold text-sm text-gray-800">لا يوجد طلاب مسندون لهذا المعلم بعد</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                يمكنك إضافة طالب إلى هذا المعلم من زر "إضافة طالب" في تبويب الطلاب.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByStudent.map((group) => {
                const st = group.student
                const stName = `${st.firstNameAr || ''} ${st.lastNameAr || ''}`.trim() || 'طالب'
                const totalStudentSessions = group.upcoming.length + group.completed.length + group.other.length

                return (
                  <div
                    key={st._id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-gray-200"
                  >
                    {/* Student Card Header */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/40 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          firstName={st.firstNameAr}
                          lastName={st.lastNameAr}
                          size="md"
                          className="flex-none"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-heading font-bold text-sm text-gray-900">{stName}</h4>
                            {st.studentType && (
                              <Badge variant={st.studentType === 'new' ? 'purple' : 'gray'}>
                                {st.studentType === 'new' ? 'طالب جديد' : 'طالب حالي'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                            {st.phone && (
                              <span className="flex items-center gap-1 font-mono text-[11px]" dir="ltr">
                                <Phone size={11} className="text-gray-400" />
                                {st.phone}
                              </span>
                            )}
                            {st.email && (
                              <span className="flex items-center gap-1 text-[11px]" dir="ltr">
                                <Mail size={11} className="text-gray-400" />
                                {st.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white px-2.5 py-1 rounded-xl border border-gray-100">
                          <span className="font-bold text-violet-700">{group.upcoming.length}</span> قادمة
                          <span className="text-gray-300">·</span>
                          <span className="font-bold text-emerald-700">{group.completed.length}</span> مكتملة
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Plus size={13} />}
                          onClick={() => setSessionModal({ open: true, session: null, prefilledStudentId: st._id })}
                        >
                          جدولة حصة
                        </Button>
                      </div>
                    </div>

                    {/* Body: Recurring Schedule + Upcoming Sessions */}
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Recurring Schedule Rules for this Student */}
                      {group.rules.length > 0 && (
                        <div className="bg-violet-50/50 rounded-xl p-3 border border-violet-100 space-y-1.5">
                          <span className="text-[11px] font-bold text-violet-900 flex items-center gap-1.5">
                            <Layers size={13} className="text-violet-600" />
                            المواعيد الدورية المعتمدة:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {group.rules.map((r) => (
                              <span
                                key={r._id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-violet-200 text-xs font-semibold text-violet-950"
                              >
                                <span>
                                  {r.daysOfWeek?.map((d) => dayLabel(d)).join(' و ') || 'أسبوعيًا'}
                                </span>
                                <span className="text-violet-500 font-mono">
                                  الساعة {r.timeOfDay || r.time}
                                </span>
                                <span className="text-[11px] text-gray-400 font-mono">
                                  ({r.durationMinutes || 60} د)
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Upcoming Sessions List */}
                      <div>
                        <h5 className="text-xs font-bold text-gray-600 mb-2.5 flex items-center gap-1.5">
                          <CalendarClock size={14} className="text-violet-600" />
                          الحصص القادمة مع {st.firstNameAr || 'الطالب'} ({group.upcoming.length})
                        </h5>

                        {group.upcoming.length === 0 ? (
                          <div className="text-center py-5 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                            لا توجد حصص قادمة مجدولة حاليًا مع هذا الطالب
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {group.upcoming.map((s) => (
                              <SessionCard
                                key={s._id}
                                session={s}
                                hideStudent
                                onEdit={() => setSessionModal({ open: true, session: s, prefilledStudentId: st._id })}
                                onCancel={() => setCancelModal({ open: true, session: s })}
                                onDelete={() => setDeleteModal({ open: true, session: s })}
                                onCopyLink={copyToClipboard}
                                copiedLink={copiedLink}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Past / Completed Sessions Collapsible */}
                      {group.completed.length > 0 && (
                        <details className="group border border-gray-100 rounded-xl p-3 bg-gray-50/30">
                          <summary className="text-xs font-bold text-gray-600 cursor-pointer flex items-center justify-between select-none">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              سجل الحصص السابقة المكتملة ({group.completed.length} حصة)
                            </span>
                            <ChevronDown size={14} className="group-open:rotate-180 transition-transform text-gray-400" />
                          </summary>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 pt-2 border-t border-gray-100">
                            {group.completed.slice(0, 6).map((s) => (
                              <SessionCard
                                key={s._id}
                                session={s}
                                hideStudent
                                onEdit={() => setSessionModal({ open: true, session: s, prefilledStudentId: st._id })}
                                onCancel={() => setCancelModal({ open: true, session: s })}
                                onDelete={() => setDeleteModal({ open: true, session: s })}
                                onCopyLink={copyToClipboard}
                                copiedLink={copiedLink}
                              />
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── View 3: Weekly Availability & Busy Schedule Map ── */}
      {viewMode === 'availability' && (
        <WeeklyScheduleView
          teacherId={teacherId}
          workingHours={workingHours}
          availabilityData={availabilityData}
          sessions={sessions}
          onSelectSession={(s) => setSessionModal({ open: true, session: s, prefilledStudentId: '' })}
          onAddSessionAtTime={(timeStr) => setSessionModal({ open: true, session: null, prefilledStudentId: '' })}
        />
      )}

      {/* ── Recurring Schedule Rules Section (Drawer / Card) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
          <div>
            <h4 className="font-heading font-bold text-sm text-gray-800 flex items-center gap-2">
              <Layers size={16} className="text-violet-600" />
              الجداول الأسبوعية الدورية النشطة ({activeRules.length})
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              تتحكم في توليد الحصص الدورية الأسبوعية التلقائية للمعلم مع طلابه
            </p>
          </div>
          {onSyncLinks && (
            <Button
              variant="outline"
              size="sm"
              icon={<Video size={13} />}
              onClick={onSyncLinks}
            >
              تعميم روابط الاجتماعات
            </Button>
          )}
        </div>

        {activeRules.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400">
            لا توجد جداول دورية نشطة لهذا المعلم حالياً
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeRules.map((rule) => {
              const st = rule.studentId
              return (
                <div key={rule._id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar firstName={st?.firstNameAr} lastName={st?.lastNameAr} size="xs" />
                      <span className="text-xs font-bold text-gray-800">
                        {st ? `${st.firstNameAr} ${st.lastNameAr || ''}` : 'طالب'}
                      </span>
                    </div>
                    <Badge variant={rule.status === 'active' ? 'success' : 'gray'} className="text-[10px]">
                      {rule.status === 'active' ? 'نشط' : rule.status}
                    </Badge>
                  </div>

                  <div className="text-xs font-mono font-semibold text-violet-700 bg-violet-50/80 px-2 py-1 rounded-lg flex items-center justify-between">
                    <span>
                      {rule.daysOfWeek?.map((d) => dayLabel(d)).join('، ') || 'أسبوعيًا'}
                    </span>
                    <span>{rule.timeOfDay || rule.time}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                    <span>المدة: {rule.durationMinutes || 60} دقيقة</span>
                    {rule.meetingLink && (
                      <a
                        href={rule.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-600 hover:underline flex items-center gap-1"
                      >
                        رابط الحصة <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {sessionModal.open && (
        <AdminSessionModal
          open={sessionModal.open}
          session={sessionModal.session}
          teacherId={teacherId}
          teacherName={`${teacher.firstNameAr} ${teacher.lastNameAr}`}
          teacherDefaultLink={teacher.meetingLinks?.[0]?.link || ''}
          studentsList={assignedStudentsList}
          prefilledStudentId={sessionModal.prefilledStudentId}
          onClose={() => setSessionModal({ open: false, session: null, prefilledStudentId: '' })}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'teacher-sessions', teacherId] })
            qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', teacherId] })
          }}
        />
      )}

      {cancelModal.open && (
        <CancelSessionModal
          open={cancelModal.open}
          session={cancelModal.session}
          onClose={() => setCancelModal({ open: false, session: null })}
          onConfirm={(reason) => handleCancelSession(cancelModal.session._id, reason)}
        />
      )}

      {deleteModal.open && (
        <ConfirmDialog
          open={deleteModal.open}
          onClose={() => setDeleteModal({ open: false, session: null })}
          onConfirm={() => handleDeleteSession(deleteModal.session._id)}
          title="حذف الحصة نهائيًا"
          message={`هل أنت متأكد من حذف الحصة "${deleteModal.session?.titleAr || 'حصة'}" نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="نعم، احذف الحصة"
          variant="danger"
        />
      )}
    </div>
  )
}

// ── Session Card Component ──────────────────────────────────────────────────

function SessionCard({
  session,
  hideStudent = false,
  onEdit,
  onCancel,
  onDelete,
  onCopyLink,
  copiedLink,
}) {
  const statusCfg = STATUS_MAP[session.status] || STATUS_MAP.scheduled
  const st = session.studentId
  const stName = st ? `${st.firstNameAr || ''} ${st.lastNameAr || ''}`.trim() : 'طالب'
  const isCancelled = session.status === 'cancelled'
  const isCompleted = session.status === 'completed'

  return (
    <div className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
      isCancelled
        ? 'bg-gray-50/70 border-gray-200 opacity-70'
        : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
    }`}>
      {/* Top Header: Time + Status Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
          <Clock size={13} className="text-violet-600" />
          <span className="font-mono">{formatTimeAr(session.scheduledAt)}</span>
          <span className="text-[11px] text-gray-400 font-normal">
            ({session.durationMinutes || 60} دقيقة)
          </span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.bg}`}>
          {statusCfg.label}
        </span>
      </div>

      {/* Title & Subject */}
      <div className="space-y-0.5">
        <p className="text-xs font-bold text-gray-900 truncate">
          {session.titleAr || `حصة ${stName}`}
        </p>
        <p className="text-[11px] text-gray-400 font-mono">
          {formatDateAr(session.scheduledAt)}
        </p>
      </div>

      {/* Student Info (if not hidden) */}
      {!hideStudent && st && (
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar firstName={st.firstNameAr} lastName={st.lastNameAr} size="xs" />
            <span className="text-xs text-gray-700 font-semibold truncate">{stName}</span>
          </div>
          {st.phone && (
            <span className="text-[10px] font-mono text-gray-400" dir="ltr">
              {st.phone}
            </span>
          )}
        </div>
      )}

      {/* Meeting Link & Controls */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1.5 text-xs">
        {session.meetingLink ? (
          <div className="flex items-center gap-1">
            <a
              href={session.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Video size={12} />
              دخول
            </a>
            <button
              type="button"
              onClick={() => onCopyLink(session.meetingLink)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              title="نسخ الرابط"
            >
              {copiedLink === session.meetingLink ? (
                <Check size={13} className="text-emerald-600" />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-gray-400 italic">بدون رابط</span>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded-lg text-gray-500 hover:text-violet-700 hover:bg-violet-50 transition-colors"
            title="تعديل الحصة"
          >
            <Edit2 size={13} />
          </button>
          {!isCancelled && !isCompleted && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
              title="إلغاء الحصة"
            >
              <XCircle size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded-lg text-gray-400 hover:text-red-700 hover:bg-red-50 transition-colors"
            title="حذف نهائي"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── View 3: Weekly Calendar & Availability Map ──────────────────────────────

function WeeklyScheduleView({
  teacherId,
  workingHours,
  availabilityData,
  sessions,
  onSelectSession,
  onAddSessionAtTime,
}) {
  const DAYS = [
    { key: 'saturday',  label: 'السبت' },
    { key: 'sunday',    label: 'الأحد' },
    { key: 'monday',    label: 'الإثنين' },
    { key: 'tuesday',   label: 'الثلاثاء' },
    { key: 'wednesday', label: 'الأربعاء' },
    { key: 'thursday',  label: 'الخميس' },
    { key: 'friday',    label: 'الجمعة' },
  ]

  // Parse weekly working hours
  const workingDaysConfig = useMemo(() => {
    const map = {}
    ;(workingHours?.days || []).forEach((d) => {
      map[d.dayOfWeek] = d
    })
    return map
  }, [workingHours])

  // Extract sessions by day of week
  const sessionsByDayOfWeek = useMemo(() => {
    const map = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    sessions.forEach((s) => {
      const dayNum = new Date(s.scheduledAt).getDay()
      map[dayNum]?.push(s)
    })
    return map
  }, [sessions])

  const dayOfWeekIndexMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
        <div>
          <h4 className="font-heading font-bold text-sm text-gray-800 flex items-center gap-2">
            <Calendar size={16} className="text-violet-600" />
            الجدول الأسبوعي وخريطة التفرغ والانشغال
          </h4>
          <p className="text-xs text-gray-400 mt-0.5">
            توضيح بصري لمواعيد الحصص المحجوزة وفترات التفرغ المتاحة لاستقبال طلاب جدد
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
            <span>حصة محجوزة (مشغول)</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>وقت متاح (متفرغ)</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span>خارج أوقات العمل</span>
          </div>
        </div>
      </div>

      {/* 7-Day Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {DAYS.map(({ key, label }) => {
          const dayIndex = dayOfWeekIndexMap[key]
          const workConfig = workingDaysConfig[key]
          const isWorkingDay = workConfig?.isEnabled !== false
          const daySessions = sessionsByDayOfWeek[dayIndex] || []

          return (
            <div
              key={key}
              className={`rounded-2xl border p-3 flex flex-col min-h-[300px] transition-all ${
                isWorkingDay
                  ? 'bg-white border-gray-200/80 shadow-2xs'
                  : 'bg-gray-50/80 border-gray-100 opacity-60'
              }`}
            >
              {/* Day Header */}
              <div className="border-b border-gray-100 pb-2 mb-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">{label}</span>
                {isWorkingDay ? (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {workConfig?.startTime || '09:00'} - {workConfig?.endTime || '21:00'}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400">عطلة</span>
                )}
              </div>

              {/* Day Body: Booked Sessions */}
              <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[320px] no-scrollbar">
                {daySessions.length > 0 ? (
                  daySessions.map((s) => {
                    const st = s.studentId
                    const stName = st ? `${st.firstNameAr || ''}` : 'طالب'
                    const isCanc = s.status === 'cancelled'

                    return (
                      <div
                        key={s._id}
                        onClick={() => onSelectSession(s)}
                        className={`p-2 rounded-xl border text-xs cursor-pointer transition-all hover:scale-[1.02] ${
                          isCanc
                            ? 'bg-gray-100 border-gray-200 text-gray-400 line-through'
                            : 'bg-violet-50/80 border-violet-200 text-violet-900 shadow-2xs'
                        }`}
                        title="انقر لتعديل الحصة"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] font-bold text-violet-700">
                          <span>{formatTimeAr(s.scheduledAt)}</span>
                          <span>{s.durationMinutes || 60}د</span>
                        </div>
                        <p className="font-bold truncate mt-0.5">{s.titleAr || `حصة ${stName}`}</p>
                        <p className="text-[10px] text-gray-500 truncate">{stName}</p>
                      </div>
                    )
                  })
                ) : isWorkingDay ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-3 text-emerald-700/70 border border-dashed border-emerald-200/80 rounded-xl bg-emerald-50/30">
                    <span className="text-[11px] font-bold">متفرغ طوال اليوم</span>
                    <span className="text-[10px] text-emerald-600/80 mt-0.5">جاهز للاستقبال</span>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-gray-400 text-[11px]">
                    غير متاح
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Admin Session Create / Edit Modal ───────────────────────────────────────

function AdminSessionModal({
  open,
  session,
  teacherId,
  teacherName,
  teacherDefaultLink,
  studentsList = [],
  prefilledStudentId,
  onClose,
  onSuccess,
}) {
  const isEditing = !!session

  const toDateTimeLocal = (d) => {
    if (!d) {
      const now = new Date()
      now.setMinutes(0, 0, 0)
      now.setHours(now.getHours() + 1)
      d = now
    }
    const dt = new Date(d)
    const pad = (n) => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  }

  const [form, setForm] = useState({
    teacherId,
    studentId: session?.studentId?._id || session?.studentId || prefilledStudentId || '',
    titleAr: session?.titleAr || 'حصة تلاوة',
    scheduledAt: toDateTimeLocal(session?.scheduledAt),
    durationMinutes: session?.durationMinutes || 60,
    meetingLink: session?.meetingLink || teacherDefaultLink || '',
    meetingProvider: session?.meetingProvider || 'zoom',
    notes: session?.notes || '',
    status: session?.status || 'scheduled',
  })

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }))

  const mut = useMutation({
    mutationFn: (payload) => {
      if (isEditing) {
        return api.patch(`/admin/sessions/${session._id}`, payload).then((r) => r.data)
      }
      return api.post('/admin/sessions', payload).then((r) => r.data)
    },
    onSuccess: () => {
      toast.success(isEditing ? 'تم تحديث بيانات الحصة بنجاح' : 'تم جدولة الحصة بنجاح')
      onSuccess?.()
      onClose()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'تعذّر حفظ بيانات الحصة')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.studentId) return toast.error('يرجى اختيار الطالب')
    if (!form.scheduledAt) return toast.error('يرجى تحديد موعد وتاريخ الحصة')

    mut.mutate({
      ...form,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      durationMinutes: Number(form.durationMinutes),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'تعديل موعد وبيانات الحصة' : 'جدولة حصة جديدة للمعلم'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mut.isPending}>
            إلغاء
          </Button>
          <Button
            variant="purple"
            loading={mut.isPending}
            onClick={handleSubmit}
          >
            {isEditing ? 'حفظ التعديلات' : 'جدولة الحصة'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
        {/* Teacher Field (Read-only) */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block">المعلم</label>
          <input
            className={`${inputCls} bg-gray-100 cursor-not-allowed`}
            value={teacherName}
            disabled
          />
        </div>

        {/* Student Picker */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1 block">
            الطالب <span className="text-red-500">*</span>
          </label>
          <select
            className={selectCls}
            value={form.studentId}
            onChange={(e) => set('studentId', e.target.value)}
            disabled={isEditing}
          >
            <option value="">— اختر الطالب —</option>
            {studentsList.map((st) => (
              <option key={st._id} value={st._id}>
                {st.firstNameAr} {st.lastNameAr || ''} {st.phone ? `(${st.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">
              تاريخ وتوقيت الحصة <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              className={inputCls}
              value={form.scheduledAt}
              onChange={(e) => set('scheduledAt', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">مدة الحصة</label>
            <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
              {[30, 45, 60].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => set('durationMinutes', dur)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    Number(form.durationMinutes) === dur
                      ? 'bg-white text-violet-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {dur} دقيقة
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1 block">عنوان الحصة</label>
          <input
            className={inputCls}
            value={form.titleAr}
            onChange={(e) => set('titleAr', e.target.value)}
            placeholder="حصة تلاوة وتجويد..."
          />
        </div>

        {/* Meeting Link */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-gray-700">رابط الاجتماع / الفصل الافتراضي</label>
            {teacherDefaultLink && form.meetingLink !== teacherDefaultLink && (
              <button
                type="button"
                onClick={() => set('meetingLink', teacherDefaultLink)}
                className="text-[11px] text-violet-600 hover:underline cursor-pointer"
              >
                استخدام رابط المعلم الافتراضي
              </button>
            )}
          </div>
          <input
            className={inputCls}
            value={form.meetingLink}
            onChange={(e) => set('meetingLink', e.target.value)}
            placeholder="https://zoom.us/j/... أو https://meet.google.com/..."
            dir="ltr"
          />
        </div>

        {/* Status (when editing) */}
        {isEditing && (
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">حالة الحصة</label>
            <select
              className={selectCls}
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              <option value="scheduled">مجدولة (Scheduled)</option>
              <option value="ongoing">جارية الآن (Ongoing)</option>
              <option value="completed">مكتملة (Completed)</option>
              <option value="cancelled">ملغاة (Cancelled)</option>
              <option value="missed">بحاجة متابعة (Missed)</option>
              <option value="no_show">غياب (No Show)</option>
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1 block">ملاحظات إدارية</label>
          <textarea
            className={`${inputCls} h-16 py-2 resize-none`}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="ملاحظات تظهر للإدارة فقط..."
          />
        </div>
      </form>
    </Modal>
  )
}

// ── Cancel Session Modal ────────────────────────────────────────────────────

function CancelSessionModal({ open, session, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const PRESET_REASONS = [
    'اعتذار من المعلم',
    'اعتذار من الطالب',
    'ظرف طارئ / إجازة',
    'عطل فني في الاتصال',
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إلغاء الحصة المجدولة"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            تراجع
          </Button>
          <Button
            variant="danger"
            onClick={() => onConfirm(reason)}
          >
            تأكيد إلغاء الحصة
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-right" dir="rtl">
        <p className="text-xs text-gray-600 leading-relaxed">
          سيتم تحويل حالة الحصة إلى <span className="font-bold text-red-600">ملغاة</span>. يرجى كتابة أو اختيار سبب الإلغاء لتوثيقه في السجل الأكاديمي.
        </p>

        <div>
          <label className="text-xs font-bold text-gray-700 mb-1 block">سبب الإلغاء</label>
          <input
            className={inputCls}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="اكتب سبب الإلغاء..."
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PRESET_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
