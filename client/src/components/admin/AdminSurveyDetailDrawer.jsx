import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  X,
  Star,
  Phone,
  User,
  GraduationCap,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  ArrowUpRight,
  UserCheck,
  Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import { formatDateAr } from '../../utils/date.js'
import { ROUTES } from '../../config/constants.js'

const RENEWAL_BADGES = {
  yes: { label: 'ينوي التجديد', variant: 'success', icon: CheckCircle2, textClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  no: { label: 'لا ينوي التجديد', variant: 'danger', icon: AlertTriangle, textClass: 'text-red-700 bg-red-50 border-red-200' },
  undecided: { label: 'لم يقرر بعد', variant: 'warning', icon: HelpCircle, textClass: 'text-amber-700 bg-amber-50 border-amber-200' },
}

export default function AdminSurveyDetailDrawer({
  survey,
  open,
  onClose,
  onMarkFollowedUp,
  isMarkingFollowUp = false,
}) {
  const [copiedKey, setCopiedKey] = useState(null)

  if (!open || !survey) return null

  const student = survey.studentId
  const teacher = survey.teacherId
  const sub = survey.subscriptionId
  const followedBy = survey.followedUpBy

  const handleCopy = (text, key) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('تم النسخ بنجاح')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const studentName = student
    ? `${student.firstNameAr || student.firstName || ''} ${student.lastNameAr || student.lastName || ''}`.trim()
    : 'طالب غير محدد'

  const teacherName = teacher
    ? `${teacher.firstNameAr || teacher.firstName || ''} ${teacher.lastNameAr || teacher.lastName || ''}`.trim()
    : 'معلم غير محدد'

  const renewalCfg = RENEWAL_BADGES[survey.renewalIntention] || RENEWAL_BADGES.undecided
  const RenewalIcon = renewalCfg.icon

  // Criteria ratings
  const criteria = [
    {
      key: 'teacherCommitment',
      label: 'التزام المعلم بالحضور والمواعيد',
      score: survey.teacherCommitmentRating ?? survey.teacherCommitment,
    },
    {
      key: 'academyFollowUp',
      label: 'متابعة واهتمام إدارة الأكاديمية',
      score: survey.academyFollowUpRating ?? survey.academyFollowUp,
    },
    {
      key: 'reportQuality',
      label: 'جودة وتفصيل التقارير الدورية',
      score: survey.reportQualityRating ?? survey.reportQuality,
    },
    {
      key: 'studentProgress',
      label: 'مدى استفادة وتقدّم الطالب',
      score: survey.studentProgressRating ?? survey.studentProgress,
    },
    {
      key: 'recommendLikelihood',
      label: 'مدى ترشيح الأكاديمية للآخرين',
      score: survey.recommendLikelihood,
    },
  ]

  const scores = criteria
    .map((c) => c.score)
    .filter((s) => typeof s === 'number' && !isNaN(s) && s > 0)
  const overallAvg =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null


  const studentDetailUrl = student?._id ? ROUTES.ADMIN_STUDENT_DETAIL.replace(':id', student._id) : null
  const teacherProfileUrl = teacher?._id ? ROUTES.ADMIN_TEACHER_PROFILE.replace(':id', teacher._id) : null
  const replacementUrl = student?._id
    ? `/admin/teacher-replacement?studentId=${student._id}&source=survey`
    : '/admin/teacher-replacement'

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px] transition-opacity"
      />

      <div className="fixed inset-y-0 end-0 max-w-full flex">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="w-screen max-w-[460px] bg-white shadow-2xl border-s border-slate-200 flex flex-col z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#fbf9fe] flex-none">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-brand-purple">
                  استبيان تقييم اشتراك
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  #{survey._id?.slice(-6) || ''}
                </span>
              </div>
              <h2 className="font-heading font-extrabold text-base text-slate-900 mt-1">
                تفاصيل الاستبيان والملاحظات
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Top Intention Banner */}
            <div className={`p-4 rounded-2xl border ${renewalCfg.textClass} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <RenewalIcon size={20} className="flex-none" />
                <div>
                  <div className="font-bold text-sm">نية التجديد: {renewalCfg.label}</div>
                  <div className="text-xs opacity-80 mt-0.5">
                    {survey.renewalIntention === 'yes'
                      ? 'الطالب مستعد للاستمرار في البرامج'
                      : survey.renewalIntention === 'no'
                      ? 'الطالب لا يرغب في التجديد حالياً'
                      : 'الطالب متردد أو بانتظار استيضاح التفاصيل'}
                  </div>
                </div>
              </div>
              {overallAvg && (
                <div className="text-center bg-white/80 rounded-xl px-2.5 py-1.5 border border-current/20 flex-none">
                  <div className="text-[10px] uppercase tracking-wider font-semibold">المعدل العام</div>
                  <div className="text-base font-extrabold font-mono">{overallAvg} / 5</div>
                </div>
              )}
            </div>

            {/* Critical Flag Badges */}
            <div className="flex flex-wrap gap-2">
              {survey.requestTeacherChange && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span>طالب يطلب تغيير المعلم</span>
                </div>
              )}
              {survey.requestAdminContact && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold">
                  <Phone size={14} className="text-red-600" />
                  <span>طلب تواصل الإدارة هاتفياً</span>
                </div>
              )}
              {survey.followedUpAt ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>
                    تمت المتابعة ({formatDateAr(survey.followedUpAt)})
                    {followedBy ? ` بواسطة ${followedBy.firstNameAr || followedBy.name || ''}` : ''}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                  <HelpCircle size={14} className="text-slate-500" />
                  <span>بانتظار إجراء المتابعة</span>
                </div>
              )}
            </div>

            {/* Student Dossier Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <User size={14} className="text-brand-purple" />
                  <span>ملف الطالب</span>
                </span>
                {studentDetailUrl && (
                  <Link
                    to={studentDetailUrl}
                    className="text-xs text-brand-purple hover:underline font-bold flex items-center gap-1"
                  >
                    <span>فتح الملف</span>
                    <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Avatar
                    firstName={student?.firstNameAr || student?.firstName}
                    lastName={student?.lastNameAr || student?.lastName}
                    size="md"
                  />
                  <div className="truncate">
                    <div className="font-bold text-sm text-slate-900 truncate">{studentName}</div>
                    <div className="text-xs text-slate-500 truncate">{student?.email || '—'}</div>
                  </div>
                </div>
                {student?.phone && (
                  <div className="flex items-center gap-1.5 flex-none">
                    <button
                      type="button"
                      onClick={() => handleCopy(student.phone, 'studentPhone')}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="نسخ رقم الهاتف"
                    >
                      {copiedKey === 'studentPhone' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={`tel:${student.phone}`}
                      className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-brand-purple transition-colors"
                      title="اتصال بالطالب"
                    >
                      <Phone size={14} />
                    </a>
                  </div>
                )}
              </div>
              {student?.phone && (
                <div className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg flex items-center justify-between">
                  <span>هاتف الطالب / ولي الأمر:</span>
                  <span className="font-bold text-slate-800">{student.phone}</span>
                </div>
              )}
            </div>

            {/* Teacher Dossier Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-brand-purple" />
                  <span>المعلم المسؤول</span>
                </span>
                {teacherProfileUrl && (
                  <Link
                    to={teacherProfileUrl}
                    className="text-xs text-brand-purple hover:underline font-bold flex items-center gap-1"
                  >
                    <span>ملف المعلم</span>
                    <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <Avatar
                    firstName={teacher?.firstNameAr || teacher?.firstName}
                    lastName={teacher?.lastNameAr || teacher?.lastName}
                    size="md"
                  />
                  <div className="truncate">
                    <div className="font-bold text-sm text-slate-900 truncate">{teacherName}</div>
                    <div className="text-xs text-slate-500 truncate">{teacher?.email || '—'}</div>
                  </div>
                </div>
                {teacher?.phone && (
                  <div className="flex items-center gap-1.5 flex-none">
                    <button
                      type="button"
                      onClick={() => handleCopy(teacher.phone, 'teacherPhone')}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="نسخ رقم هاتف المعلم"
                    >
                      {copiedKey === 'teacherPhone' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={`tel:${teacher.phone}`}
                      className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-brand-purple transition-colors"
                      title="اتصال بالمعلم"
                    >
                      <Phone size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed 5-Star Ratings Breakdown */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  <span>تفاصيل التقييم (1 - 5 نجوم)</span>
                </span>
                <span className="text-xs text-slate-400">
                  تاريخ الإكمال: {formatDateAr(survey.completedAt)}
                </span>
              </div>

              <div className="space-y-2.5">
                {criteria.map((c) => {
                  const score = c.score || 0
                  return (
                    <div
                      key={c.key}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-slate-700 font-medium truncate">
                        {c.label}
                      </span>
                      <div className="flex items-center gap-2 flex-none">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={13}
                              className={
                                star <= score
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-200 fill-slate-200'
                              }
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold font-mono text-slate-800 w-8 text-left">
                          {score ? `${score}/5` : '—'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Student Feedback Notes */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <MessageSquare size={14} className="text-brand-purple" />
                <span>رأي وملاحظات الطالب النصية</span>
              </div>
              {survey.notes ? (
                <blockquote className="p-3.5 rounded-xl bg-purple-50/50 border-r-4 border-brand-purple text-xs text-slate-800 leading-relaxed italic">
                  "{survey.notes}"
                </blockquote>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 text-xs text-slate-400 text-center italic">
                  لم يسجل الطالب أي ملاحظات نصية إضافية.
                </div>
              )}
            </div>

            {/* Subscription Context if populated */}
            {sub && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-slate-400" />
                  <span>الباقة المقترنة:</span>
                  <span className="font-bold text-slate-800">
                    {sub.packageId?.nameAr || 'الباقة الأساسية'}
                  </span>
                </div>
                <span className="font-mono text-slate-400 text-[11px]">
                  #{sub._id?.slice(-6) || ''}
                </span>
              </div>
            )}
          </div>

          {/* Fixed Footer Actions */}
          <div className="p-4 border-t border-slate-100 bg-white space-y-2 flex-none">
            {survey.requestTeacherChange && (
              <Link
                to={replacementUrl}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <UserCheck size={15} />
                <span>نقل الطالب لمعلم آخر (معالجة طلب التغيير)</span>
              </Link>
            )}

            <div className="flex items-center gap-2">
              {!survey.followedUpAt ? (
                <Button
                  variant="purple"
                  className="flex-1 text-xs py-2.5"
                  loading={isMarkingFollowUp}
                  onClick={() => onMarkFollowedUp && onMarkFollowedUp(survey._id)}
                >
                  <CheckCircle2 size={14} className="me-1.5" />
                  تسجيل التواصل والمتابعة
                </Button>
              ) : (
                <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold text-center border border-emerald-200 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={15} />
                  <span>تمت المتابعة والتواصل بنجاح</span>
                </div>
              )}
              <Button variant="ghost" className="text-xs py-2.5" onClick={onClose}>
                إغلاق
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
