import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ExternalLink, ChevronDown, CheckCircle2, AlertTriangle, Clock,
  Video, Link2Off, Eye, ShieldAlert, Edit3, UserCheck, UserX,
} from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import Avatar from '../ui/Avatar.jsx'
import AttendanceStatusBadge from '../ui/AttendanceStatusBadge.jsx'
import { formatDateAr, formatTimeAr, formatDateTimeAr } from '../../utils/date.js'
import { formatSessionTitle } from '../../utils/sessionTitle.js'
import {
  SESSION_STATUS, PAYROLL_STATUS, REVIEW_SEVERITY, REVIEW_STATE,
  CONFIDENCE_LEVEL, ROUTES, getFileUrl,
} from '../../config/constants.js'

export default function OperationsTableView({
  sessions = [],
  onOpenCorrection,
  onOpenReview,
}) {
  const [expandedId, setExpandedId] = useState(null)

  const toggleExpand = (id) => {
    setExpandedId((curr) => (curr === id ? null : id))
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto min-h-[320px]">
        <table className="w-full min-w-[960px] text-right" dir="rtl">
          <thead>
            <tr className="bg-[#fcfaff] border-b border-gray-100 text-[11px] font-bold text-[#7c6aaa] select-none">
              <th className="py-3.5 px-4">التوقيت والجدول</th>
              <th className="py-3.5 px-4">الحصة والطالب</th>
              <th className="py-3.5 px-4">المعلم</th>
              <th className="py-3.5 px-4">رابط الحصة</th>
              <th className="py-3.5 px-4">حضور المعلم</th>
              <th className="py-3.5 px-4">اعتماد الطالب</th>
              <th className="py-3.5 px-4">استحقاق الراتب</th>
              <th className="py-3.5 px-4">مستوى الثقة</th>
              <th className="py-3.5 px-4 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-xs">
            {sessions.map((s) => {
              const isExpanded = expandedId === s._id
              const statusInfo = SESSION_STATUS[s.status] || SESSION_STATUS.scheduled
              const payrollInfo = PAYROLL_STATUS[s.payrollStatus]
              const conf = s.confidence ? CONFIDENCE_LEVEL[s.confidence.level] : null
              const isLive = s.status === 'in_progress' || (s.window && s.window.phase === 'in_progress')
              const studentName = s.studentId ? `${s.studentId.firstNameAr || ''} ${s.studentId.lastNameAr || ''}`.trim() : 'طالب غير محدد'
              const teacherName = s.teacherId ? `${s.teacherId.firstNameAr || ''} ${s.teacherId.lastNameAr || ''}`.trim() : 'معلم غير محدد'
              const formattedTitle = formatSessionTitle(s.titleAr, studentName)

              return (
                <tr
                  key={s._id}
                  className={`transition-colors group ${
                    isExpanded ? 'bg-[#fbf9ff]' : 'hover:bg-[#fdfcff]'
                  }`}
                >
                  {/* 1. Timing & Date */}
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {isLive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-none" />
                      )}
                      <div>
                        <div className="font-heading font-extrabold text-[#1f1147] text-[13px] leading-tight">
                          {formatTimeAr(s.scheduledAt)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {formatDateAr(s.scheduledAt)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. Session Title & Student */}
                  <td className="py-3.5 px-4 align-middle max-w-[210px]">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={getFileUrl(s.studentId?.avatar)}
                        firstName={s.studentId?.firstNameAr}
                        lastName={s.studentId?.lastNameAr}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <div className="font-heading font-bold text-[#1f1147] text-[12px] truncate">
                          {formattedTitle}
                        </div>
                        <RouterLink
                          to={`/admin/students/${s.studentId?._id || ''}`}
                          className="text-[11px] text-[#7c6aaa] hover:text-brand-purple truncate block"
                        >
                          {studentName}
                        </RouterLink>
                      </div>
                    </div>
                  </td>

                  {/* 3. Teacher */}
                  <td className="py-3.5 px-4 align-middle max-w-[170px]">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={getFileUrl(s.teacherId?.avatar)}
                        firstName={s.teacherId?.firstNameAr}
                        lastName={s.teacherId?.lastNameAr}
                        size="xs"
                      />
                      <span className="font-semibold text-gray-800 text-xs truncate">
                        {teacherName}
                      </span>
                    </div>
                  </td>

                  {/* 4. Meeting Link */}
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    {s.meetingLink ? (
                      <a
                        href={s.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-brand-purple hover:bg-purple-100 font-semibold text-[11px] transition-colors"
                        title={s.meetingLink}
                      >
                        <Video size={12} />
                        <span>{s.meetingProvider || 'الاجتماع'}</span>
                        <ExternalLink size={10} className="text-brand-purple/70" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium text-[10px]">
                        <Link2Off size={11} />
                        بلا رابط
                      </span>
                    )}
                  </td>

                  {/* 5. Teacher Attendance Status */}
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    <div className="flex flex-col gap-0.5">
                      <AttendanceStatusBadge status={s.teacherAttendanceStatus || 'pending'} size="sm" />
                      {s.teacherStartedAt && (
                        <span className="text-[10px] text-gray-400">
                          {formatTimeAr(s.teacherStartedAt)}
                        </span>
                      )}
                      {s.teacherLateMinutes > 0 && (
                        <span className="text-[10px] text-red-500 font-bold">
                          +{s.teacherLateMinutes} دقيقة
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 6. Student Attendance */}
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    {s.attendanceFinalizedAt ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} />
                        معتمد
                      </span>
                    ) : s.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Clock size={12} />
                        بانتظار الاعتماد
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">—</span>
                    )}
                  </td>

                  {/* 7. Payroll Status */}
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    {payrollInfo ? (
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-block"
                        style={{ background: `${payrollInfo.color}15`, color: payrollInfo.color }}
                      >
                        {payrollInfo.label}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">—</span>
                    )}
                  </td>

                  {/* 8. Confidence Level */}
                  <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                    {conf ? (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block"
                        style={{ background: `${conf.color}18`, color: conf.color }}
                        title="مؤشر الثقة التشغيلية في اكتمال الأدلة"
                      >
                        {conf.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </td>

                  {/* 9. Action Button */}
                  <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleExpand(s._id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-[#1f1147] hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
                      title={isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل والإجراءات'}
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-brand-purple' : ''}`}
                      />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Expandable row detail overlay */}
      <AnimatePresence>
        {expandedId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-100 bg-[#fbf9fe] p-4 text-xs text-gray-700"
          >
            {(() => {
              const activeSession = sessions.find((x) => x._id === expandedId)
              if (!activeSession) return null

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-extrabold text-[#1f1147] text-sm">
                        {activeSession.titleAr}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        (معرف الحصة: {activeSession._id})
                      </span>
                    </div>
                    {onOpenCorrection && (
                      <button
                        type="button"
                        onClick={() => onOpenCorrection(activeSession)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-sm transition-all"
                      >
                        <Edit3 size={13} />
                        تعديل / تصحيح الحضور والراتب
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">توقيت تسجيل حضور المعلم:</span>
                      <span className="font-semibold text-gray-800">
                        {activeSession.teacherStartedAt ? formatDateTimeAr(activeSession.teacherStartedAt) : 'لم يسجل حضوره'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">اعتماد حضور الطالب:</span>
                      <span className="font-semibold text-gray-800">
                        {activeSession.attendanceFinalizedAt ? formatDateTimeAr(activeSession.attendanceFinalizedAt) : 'لم يتم الاعتماد بعد'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">سبب استحقاق الراتب:</span>
                      <span className="font-semibold text-gray-800">
                        {activeSession.payrollStatusReason || 'ضمن الإجراء الطبيعي'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block mb-0.5">رابط الغرفة:</span>
                      {activeSession.meetingLink ? (
                        <a href={activeSession.meetingLink} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline font-semibold flex items-center gap-1">
                          فتح الرابط <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-red-500 font-semibold">غير متوفر</span>
                      )}
                    </div>
                  </div>

                  {activeSession.reviewAssessment && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold mb-1">
                        <ShieldAlert size={14} className="text-amber-600" />
                        <span>أسباب الحاجة للمراجعة:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                        {activeSession.reviewAssessment.reasons.map((r, idx) => (
                          <li key={idx}>{r.label}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
