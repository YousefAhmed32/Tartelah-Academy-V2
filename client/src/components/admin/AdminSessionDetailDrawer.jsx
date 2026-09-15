import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  X,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  RefreshCw,
  Edit2,
  XCircle,
  FileText,
  CreditCard,
  UserCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Avatar from '../ui/Avatar.jsx'
import AttendanceStatusBadge from '../ui/AttendanceStatusBadge.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { PAYROLL_STATUS, ROUTES, getFileUrl } from '../../config/constants.js'

const STATUS_MAP = {
  scheduled: { label: 'مجدولة', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  ongoing: { label: 'جارية الآن', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  completed: { label: 'مكتملة', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  cancelled: { label: 'ملغاة', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  rescheduled: { label: 'معاد جدولتها', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  missed: { label: 'بحاجة متابعة', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  no_show: { label: 'غياب', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
}

export default function AdminSessionDetailDrawer({
  session,
  open,
  onClose,
  onEdit,
  onReschedule,
  onCorrect,
  onCancel,
}) {
  const [copied, setCopied] = useState(false)

  if (!open || !session) return null

  const student = session.studentId
  const teacher = session.teacherId
  const statusCfg = STATUS_MAP[session.status] || STATUS_MAP.scheduled
  const payrollCfg = PAYROLL_STATUS[session.payrollStatus] || PAYROLL_STATUS.pending
  const canCancel = ['scheduled', 'ongoing'].includes(session.status)

  const copyMeetingLink = () => {
    if (!session.meetingLink) return
    navigator.clipboard.writeText(session.meetingLink)
    setCopied(true)
    toast.success('تم نسخ رابط الاجتماع')
    setTimeout(() => setCopied(false), 2000)
  }

  const studentUrl = student?._id ? ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', student._id) : null
  const teacherUrl = teacher?._id ? ROUTES.ADMIN_TEACHER_PROFILE.replace(':id', teacher._id) : null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px] transition-opacity"
      />

      <div className="fixed inset-y-0 end-0 max-w-full flex">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="w-screen max-w-md bg-white shadow-2xl border-s border-gray-100 flex flex-col z-10"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#fbf9fe]">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                >
                  {statusCfg.label}
                </span>
                <span className="text-xs text-gray-400 font-mono">#{session._id.slice(-6)}</span>
              </div>
              <h2 className="font-heading font-extrabold text-lg text-gray-900 mt-1 truncate max-w-[280px]">
                {session.titleAr || 'تفاصيل الحصة'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-gray-200/60 flex items-center justify-center text-gray-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Time and Duration Card */}
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{formatDateAr(session.scheduledAt)}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Clock size={12} className="text-gray-400" />
                      <span>{formatTimeAr(session.scheduledAt)}</span>
                      <span>·</span>
                      <span className="font-semibold text-violet-700">{session.durationMinutes} دقيقة</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Parties: Student & Teacher */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">أطراف الحصة</div>

              {/* Student Card */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 hover:border-violet-100 bg-white shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={getFileUrl(student?.avatar)}
                    firstName={student?.firstNameAr}
                    lastName={student?.lastNameAr}
                    size="sm"
                    className="ring-2 ring-violet-100"
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400 font-medium">الطالب</div>
                    <div className="font-heading font-bold text-sm text-gray-900 truncate">
                      {student?.firstNameAr} {student?.lastNameAr || ''}
                    </div>
                    {student?.email && <div className="text-[11px] text-gray-400 truncate">{student.email}</div>}
                  </div>
                </div>
                {studentUrl && (
                  <Link
                    to={studentUrl}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors flex-none"
                  >
                    <span>الملف</span>
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              {/* Teacher Card */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 hover:border-amber-100 bg-white shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={getFileUrl(teacher?.avatar)}
                    firstName={teacher?.firstNameAr}
                    lastName={teacher?.lastNameAr}
                    size="sm"
                    className="ring-2 ring-amber-100"
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400 font-medium">المعلم</div>
                    <div className="font-heading font-bold text-sm text-gray-900 truncate">
                      {teacher?.firstNameAr} {teacher?.lastNameAr || ''}
                    </div>
                    {teacher?.email && <div className="text-[11px] text-gray-400 truncate">{teacher.email}</div>}
                  </div>
                </div>
                {teacherUrl && (
                  <Link
                    to={teacherUrl}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex-none"
                  >
                    <span>الملف</span>
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>

            {/* Meeting Room Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Video size={14} className="text-violet-600" />
                  <span>قاعة الاجتماع</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">
                  {session.meetingProvider || 'Zoom'}
                </span>
              </div>

              {session.meetingLink ? (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs font-mono text-gray-600 truncate dir-ltr text-left">
                    {session.meetingLink}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>دخول القاعة الآن</span>
                    </a>
                    <button
                      type="button"
                      onClick={copyMeetingLink}
                      className="h-9 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-xs text-amber-800 flex items-center justify-between">
                  <span>لم يتم تعيين رابط اجتماع لهذه الحصة بعد</span>
                  <button
                    onClick={() => onEdit(session)}
                    className="text-xs font-bold text-amber-700 underline hover:text-amber-900"
                  >
                    تعيين رابط
                  </button>
                </div>
              )}
            </div>

            {/* Attendance & Payroll Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={14} className="text-emerald-600" />
                <span>حضور المعلم والراتب</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-[11px] text-gray-400">حضور المعلم</div>
                  <div className="mt-1">
                    <AttendanceStatusBadge status={session.teacherAttendanceStatus || 'pending'} size="sm" />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="text-[11px] text-gray-400">استحقاق الراتب</div>
                  <div className="mt-1 flex items-center gap-1">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${payrollCfg.color}18`, color: payrollCfg.color }}
                    >
                      <CreditCard size={11} />
                      {payrollCfg.label}
                    </span>
                  </div>
                </div>
              </div>

              {session.payrollStatusReason && (
                <div className="p-2.5 rounded-xl bg-gray-50 text-xs text-gray-600">
                  <span className="font-semibold text-gray-700">ملاحظة الراتب: </span>
                  {session.payrollStatusReason}
                </div>
              )}
            </div>

            {/* Notes if any */}
            {(session.notes || session.teacherNotes) && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-2">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-600" />
                  <span>الملاحظات</span>
                </div>
                {session.notes && (
                  <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-xl leading-relaxed">
                    <span className="font-semibold text-gray-800">ملاحظات الإدارة: </span>
                    {session.notes}
                  </p>
                )}
                {session.teacherNotes && (
                  <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-xl leading-relaxed">
                    <span className="font-semibold text-gray-800">ملاحظات المعلم: </span>
                    {session.teacherNotes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/80 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onEdit(session)
                }}
                className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Edit2 size={13} />
                <span>تعديل الحصة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose()
                  onCorrect(session)
                }}
                className="h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <ShieldAlert size={13} />
                <span>تصحيح الحضور</span>
              </button>
            </div>

            {canCancel && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onReschedule(session)
                  }}
                  className="flex-1 h-9 rounded-xl border border-gray-200 hover:bg-white text-gray-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>إعادة جدولة</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onCancel(session)
                  }}
                  className="flex-1 h-9 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <XCircle size={12} />
                  <span>إلغاء الحصة</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
