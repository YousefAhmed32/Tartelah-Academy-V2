import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
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
  GraduationCap,
  FileCheck,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Avatar from '../ui/Avatar.jsx'
import AttendanceStatusBadge from '../ui/AttendanceStatusBadge.jsx'
import AdminSessionScheduleEditor from './AdminSessionScheduleEditor.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { formatSessionTitle } from '../../utils/sessionTitle.js'
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

const STUDENT_STATUS_MAP = {
  present: { label: 'حاضر', color: '#16a34a', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  late: { label: 'متأخر', color: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  absent: { label: 'غائب', color: '#dc2626', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  excused: { label: 'معذور', color: '#7c3aed', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  left_early: { label: 'غادر مبكراً', color: '#0284c7', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  technical_issue: { label: 'مشكلة تقنية', color: '#475569', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  pending: { label: 'بانتظار التحضير', color: '#64748b', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
}

export default function AdminSessionDetailDrawer({
  session,
  open,
  onClose,
  onEdit,
  onReschedule,
  onCorrect,
  onCancel,
  onSessionUpdated,
}) {
  const [copied, setCopied] = useState(false)
  const [inlineAction, setInlineAction] = useState(null)
  const navigate = useNavigate()

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
                {formatSessionTitle(session)}
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

            {/* 1. Student & Teacher Attendance Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <UserCheck size={14} className="text-emerald-600" />
                  <span>حضور الطرفين والالتزام</span>
                </div>
                <span className="text-[11px] text-gray-400 font-normal">تسجيل الحضور الفعلي</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Teacher Attendance */}
                <div className="p-3 rounded-xl bg-gray-50/90 border border-gray-100 space-y-1.5">
                  <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                    <UserCheck size={12} className="text-amber-600" />
                    <span>حضور المعلم</span>
                  </div>
                  <div>
                    <AttendanceStatusBadge status={session.teacherAttendanceStatus || 'pending'} size="sm" />
                  </div>
                  <div className="text-[11px] text-gray-500 pt-0.5 leading-tight">
                    {session.teacherStartedAt ? (
                      <span className="text-emerald-700 font-medium">بدأ {formatTimeAr(session.teacherStartedAt)}</span>
                    ) : session.isLate || session.teacherAttendanceStatus === 'late' ? (
                      <span className="text-rose-600 font-bold">متأخر ({session.lateMinutes || session.teacherLateMinutes || 5}+ د)</span>
                    ) : session.teacherAttendanceStatus === 'absent' ? (
                      <span className="text-rose-600 font-bold">غائب عن الحصة</span>
                    ) : (
                      <span className="text-gray-400">بانتظار بدء المعلم</span>
                    )}
                  </div>
                  {session.teacherAttendanceNotes && (
                    <div className="text-[10px] text-gray-400 border-t border-gray-200/50 pt-1">
                      {session.teacherAttendanceNotes}
                    </div>
                  )}
                </div>

                {/* Student Attendance */}
                {(() => {
                  const stKey = session.studentAttendanceStatus
                    || session.attendance?.status
                    || (session.status === 'completed' ? 'present' : (session.status === 'scheduled' ? 'pending' : 'pending'))
                  const stCfg = STUDENT_STATUS_MAP[stKey] || STUDENT_STATUS_MAP.pending
                  return (
                    <div className="p-3 rounded-xl bg-gray-50/90 border border-gray-100 space-y-1.5">
                      <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                        <GraduationCap size={12} className="text-violet-600" />
                        <span>حضور الطالب</span>
                      </div>
                      <div>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${stCfg.bg} ${stCfg.text} ${stCfg.border}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: stCfg.color }} />
                          <span>{stCfg.label}</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 pt-0.5 leading-tight">
                        {session.attendance?.arrivalTime ? (
                          <span className="text-emerald-700 font-medium">حضر {formatTimeAr(session.attendance.arrivalTime)}</span>
                        ) : stKey === 'present' ? (
                          <span className="text-emerald-700 font-medium">حضر الحصة ✓</span>
                        ) : stKey === 'absent' ? (
                          <span className="text-rose-600 font-bold">غائب</span>
                        ) : (
                          <span className="text-gray-400">بانتظار تسجيل الحضور</span>
                        )}
                      </div>
                      {session.attendance?.notes && (
                        <div className="text-[10px] text-gray-400 border-t border-gray-200/50 pt-1">
                          {session.attendance.notes}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* 2. Payroll & Quran Report Card */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CreditCard size={14} className="text-blue-600" />
                  <span>الراتب وتقرير الحلقة القرآني</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Payroll Readiness */}
                <div className="p-3 rounded-xl bg-gray-50/90 border border-gray-100 space-y-1.5">
                  <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                    <CreditCard size={12} className="text-gray-400" />
                    <span>استحقاق الراتب</span>
                  </div>
                  <div>
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${payrollCfg.color}18`, color: payrollCfg.color }}
                    >
                      {payrollCfg.label}
                    </span>
                  </div>
                  {session.payrollStatusReason && (
                    <div className="text-[10px] text-gray-500 pt-0.5 leading-tight">
                      {session.payrollStatusReason}
                    </div>
                  )}
                </div>

                {/* Quran Session Report */}
                {(() => {
                  const rep = session.report
                  const isReportRequired = session.quranReportRequired !== false
                  const hasRep = session.hasReport || session.isReportSubmitted || ['submitted', 'approved'].includes(rep?.status)
                  const isDraft = rep?.status === 'draft'
                  const isMissing = isReportRequired && ['completed', 'ongoing'].includes(session.status) && !hasRep && !isDraft

                  return (
                    <div className="p-3 rounded-xl bg-gray-50/90 border border-gray-100 space-y-1.5">
                      <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                        <FileCheck size={12} className="text-emerald-600" />
                        <span>تقرير الحلقة</span>
                      </div>
                      <div>
                        {!isReportRequired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <FileCheck size={11} />
                            <span>غير مطلوب — حصة سابقة معتمدة</span>
                          </span>
                        ) : hasRep ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <FileCheck size={11} />
                            <span>{rep?.status === 'approved' ? 'معتمد ✓' : 'تم الإرسال'}</span>
                          </span>
                        ) : isDraft ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <FileText size={11} />
                            <span>مسودة تقرير</span>
                          </span>
                        ) : isMissing ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle size={11} />
                            <span>لم يُرسل التقرير</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400">
                            <span>بانتظار انتهاء الحلقة</span>
                          </span>
                        )}
                      </div>
                      {hasRep && (
                        <div className="text-[10px] text-emerald-700 pt-0.5">
                          {rep?.generalEvaluation ? `التقييم: ${rep.generalEvaluation}` : 'تقرير مكتمل'}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
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

          {/* Footer Actions with Safe Fallbacks */}
          {(() => {
            const handleEdit = () => {
              if (typeof onEdit === 'function') {
                onClose()
                onEdit(session)
              } else {
                setInlineAction('edit')
              }
            }
            const handleCorrect = () => {
              onClose()
              if (typeof onCorrect === 'function') onCorrect(session)
              else navigate(`${ROUTES.ADMIN_SESSIONS}?search=${session._id}`)
            }
            const handleReschedule = () => {
              if (typeof onReschedule === 'function') {
                onClose()
                onReschedule(session)
              } else {
                setInlineAction('reschedule')
              }
            }
            const handleCancelAction = () => {
              onClose()
              if (typeof onCancel === 'function') onCancel(session)
              else navigate(`${ROUTES.ADMIN_SESSIONS}?search=${session._id}`)
            }

            return (
              <div className="p-4 border-t border-gray-100 bg-gray-50/80 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>تعديل الحصة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCorrect}
                    className="h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <ShieldAlert size={13} />
                    <span>تصحيح الحضور</span>
                  </button>
                </div>

                {canCancel && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReschedule}
                      className="flex-1 h-9 rounded-xl border border-gray-200 hover:bg-white text-gray-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw size={12} />
                      <span>إعادة جدولة</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelAction}
                      className="flex-1 h-9 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle size={12} />
                      <span>إلغاء الحصة</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </motion.div>
      </div>
      <AdminSessionScheduleEditor
        open={!!inlineAction}
        session={session}
        mode={inlineAction || 'edit'}
        onClose={() => setInlineAction(null)}
        onSaved={(updatedSession) => onSessionUpdated?.(updatedSession)}
      />
    </div>
  )
}
