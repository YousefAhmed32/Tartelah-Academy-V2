import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Gift, ShieldAlert, SlidersHorizontal, Snowflake, CheckCircle2,
  Calendar, Clock, User, ArrowLeftRight, ChevronDown
} from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Spinner from '../ui/Spinner.jsx'

const inputCls = 'w-full h-11 bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-gray-400'
const selectCls = 'w-full h-11 bg-gray-50/80 border border-gray-200 rounded-xl px-3.5 pe-9 text-sm text-gray-800 outline-none focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all appearance-none cursor-pointer'
const labelCls = 'text-xs font-bold text-gray-700 mb-1.5 block'

const PRESET_AMOUNTS = [1, 2, 4, 8, 12, 16]

const TABS = [
  { key: 'consume', label: 'حصة مستهلكة (للطالب والمعلم)', icon: CheckCircle2, color: 'text-emerald-600', activeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { key: 'adjust', label: 'تعديل / خصم الرصيد', icon: SlidersHorizontal, color: 'text-violet-600', activeBg: 'bg-violet-50 text-violet-800 border-violet-300' },
  { key: 'bonus', label: 'مكافأة حصص', icon: Gift, color: 'text-amber-600', activeBg: 'bg-amber-50 text-amber-800 border-amber-300' },
  { key: 'compensation', label: 'حصص تعويضية', icon: ShieldAlert, color: 'text-blue-600', activeBg: 'bg-blue-50 text-blue-800 border-blue-300' },
  { key: 'freeze', label: 'تجميد / فك التجميد', icon: Snowflake, color: 'text-sky-600', activeBg: 'bg-sky-50 text-sky-800 border-sky-300' },
]

export default function WalletOperationsModal({
  open,
  onClose,
  studentId,
  studentName = 'الطالب',
  currentWallet = null,
  assignedTeacher = null,
  subscription = null,
  defaultTeacherId = '',
}) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('consume')
  const [amount, setAmount] = useState(1)
  const [adjustmentType, setAdjustmentType] = useState('credit') // 'credit' (+), 'debit' (-)
  const [reason, setReason] = useState('')
  const [resumeAt, setResumeAt] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [durationMinutes, setDurationMinutes] = useState(60)

  const isFrozen = !!currentWallet?.isFrozen
  const currentBalance = Number(currentWallet?.balance || 0)

  // Fetch all active teachers for the dropdown
  const { data: teachers = [] } = useQuery({
    queryKey: ['admin', 'teachers', 'all-active'],
    queryFn: () => api.get('/admin/teachers?status=active&limit=100').then(r => r.data.data || []),
    enabled: open,
  })

  // Fetch student's recurring schedule rules ("الجدول الدوري") to resolve their assigned teacher
  const { data: scheduleData } = useQuery({
    queryKey: ['admin', 'student', 'schedule-rules', studentId],
    queryFn: () => api.get('/admin/schedule-rules', { params: { studentId, limit: 5 } }).then(r => r.data),
    enabled: open && !!studentId,
  })

  // Determine the student's primary teacher: priority to active recurring schedule rule, then active subscription
  const activeScheduleRule = (scheduleData?.data || []).find((r) => r.status === 'active') || (scheduleData?.data || [])[0]
  const recurringTeacher = activeScheduleRule?.teacherId
  const subTeacher = subscription?.teacherId || assignedTeacher
  const primaryTeacher = recurringTeacher || subTeacher
  const primaryTeacherId = primaryTeacher?._id || (typeof primaryTeacher === 'string' ? primaryTeacher : '') || defaultTeacherId || ''

  // Combine teachers list ensuring primary teacher is never missing
  const allTeacherOptions = useMemo(() => {
    const list = [...(teachers || [])]
    if (primaryTeacher && primaryTeacher._id && !list.some((t) => t._id === primaryTeacher._id)) {
      list.unshift(primaryTeacher)
    }
    return list
  }, [teachers, primaryTeacher])

  useEffect(() => {
    if (open) {
      setAmount(1)
      setReason('')
      setResumeAt('')
      setAdjustmentType('credit')
      setSelectedTeacherId(primaryTeacherId || '')
      setSessionDate(new Date().toISOString().slice(0, 10))
      setDurationMinutes(60)
    }
  }, [open, activeTab, primaryTeacherId])

  useEffect(() => {
    if (open && primaryTeacherId && !selectedTeacherId) {
      setSelectedTeacherId(primaryTeacherId)
    }
  }, [open, primaryTeacherId, selectedTeacherId])

  // Live simulation of new balance
  const simulatedBalance = useMemo(() => {
    const num = Math.max(0, Number(amount) || 0)
    if (activeTab === 'consume') return Math.max(0, currentBalance - num)
    if (activeTab === 'bonus') return currentBalance + num
    if (activeTab === 'compensation') return currentBalance + num
    if (activeTab === 'adjust') {
      return adjustmentType === 'credit' ? currentBalance + num : Math.max(0, currentBalance - num)
    }
    return currentBalance
  }, [activeTab, amount, adjustmentType, currentBalance])

  const opMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim() && activeTab !== 'freeze' && !isFrozen) {
        throw new Error('يرجى كتابة سبب العملية')
      }

      if (activeTab === 'consume') {
        const num = Number(amount)
        if (!num || num <= 0) throw new Error('يرجى إدخال عدد حصص صحيح')
        return api.post(`/wallet/${studentId}/consume`, {
          amount: num,
          reason: reason.trim(),
          teacherId: selectedTeacherId || undefined,
          scheduledAt: sessionDate || undefined,
          durationMinutes: Number(durationMinutes) || 60,
        }).then(r => r.data)
      }

      if (activeTab === 'bonus') {
        const num = Number(amount)
        if (!num || num <= 0) throw new Error('يرجى إدخال عدد حصص صحيح')
        return api.post(`/wallet/${studentId}/bonus`, { amount: num, reason: reason.trim() }).then(r => r.data)
      }

      if (activeTab === 'compensation') {
        const num = Number(amount)
        if (!num || num <= 0) throw new Error('يرجى إدخال عدد حصص صحيح')
        return api.post(`/wallet/${studentId}/compensation`, { amount: num, reason: reason.trim() }).then(r => r.data)
      }

      if (activeTab === 'adjust') {
        const num = Number(amount)
        if (!num || num <= 0) throw new Error('يرجى إدخال عدد حصص صحيح')
        const finalAmount = adjustmentType === 'credit' ? num : -num
        return api.post(`/wallet/${studentId}/adjust`, { amount: finalAmount, reason: reason.trim() }).then(r => r.data)
      }

      if (activeTab === 'freeze') {
        if (isFrozen) {
          // Resume wallet
          return api.post(`/wallet/${studentId}/resume`).then(r => r.data)
        } else {
          // Freeze wallet
          if (!reason.trim()) throw new Error('يرجى كتابة سبب التجميد')
          return api.post(`/wallet/${studentId}/freeze`, {
            reason: reason.trim(),
            resumeAt: resumeAt ? new Date(resumeAt).toISOString() : undefined,
          }).then(r => r.data)
        }
      }
    },
    onSuccess: (res) => {
      toast.success(res?.message || 'تم تنفيذ العملية وتحديث المحفظة بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'student', studentId, 'wallet'] })
      qc.invalidateQueries({ queryKey: ['admin', 'student', studentId, 'wallet-transactions'] })
      qc.invalidateQueries({ queryKey: ['admin', 'student', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile'] })
      qc.invalidateQueries({ queryKey: ['admin', 'payroll'] })
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['wallet'] })
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      qc.invalidateQueries({ queryKey: ['subscription'] })
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['student', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['student', 'wallet'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'students'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] })
      onClose()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || 'حدث خطأ في تنفيذ العملية')
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`إدارة محفظة: ${studentName}`}
      size="lg"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between w-full gap-2">
          <Button variant="ghost" onClick={onClose} disabled={opMutation.isPending} className="w-full sm:w-auto">
            إلغاء
          </Button>
          <Button
            variant={activeTab === 'freeze' && isFrozen ? 'success' : 'purple'}
            loading={opMutation.isPending}
            onClick={() => opMutation.mutate()}
            className="w-full sm:w-auto"
          >
            {activeTab === 'freeze' ? (isFrozen ? 'فك تجميد المحفظة الآن' : 'تأكيد تجميد المحفظة') : 'تأكيد تنفيذ العملية'}
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-4">
        {/* Current status pill */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500 font-semibold">الرصيد المتاح:</span>
            <span className="font-extrabold text-gray-900 text-sm font-mono bg-white px-2 py-0.5 rounded-lg border border-gray-200">
              {currentWallet?.balance != null ? `${currentWallet.balance} حصة` : '—'}
            </span>
            {currentWallet?.bonusLessons > 0 && (
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold font-mono">
                +{currentWallet.bonusLessons} مكافأة
              </span>
            )}
            {currentWallet?.compensationLessons > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold font-mono">
                +{currentWallet.compensationLessons} تعويض
              </span>
            )}
          </div>
          <span className={`px-2.5 py-1 rounded-full font-bold self-start sm:self-auto ${isFrozen ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
            {isFrozen ? 'المحفظة مجمدة' : 'المحفظة نشطة'}
          </span>
        </div>

        {/* Operation Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive ? 'bg-white text-gray-900 shadow-sm border border-gray-200/70' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={14} className={t.color} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Live Simulation Preview Strip */}
        {activeTab !== 'freeze' && (
          <div className="bg-violet-50/50 border border-violet-100 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-violet-950">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={14} className="text-violet-600 flex-shrink-0" />
              <span>معاينة الرصيد بعد العملية:</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-gray-500 line-through">{currentBalance}</span>
              <span className="text-gray-400">➔</span>
              <span className="font-extrabold text-sm text-violet-900 bg-white px-2.5 py-0.5 rounded-md border border-violet-200">
                {simulatedBalance} حصة
              </span>
            </div>
          </div>
        )}

        {/* Tab 0: Consume Lesson (Deducts student balance & credits teacher) */}
        {activeTab === 'consume' && (
          <div className="space-y-3">
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3.5 text-xs text-emerald-950 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>تسجيل حصة مستهلكة (Consumed Lesson):</span>
              </div>
              <p className="text-emerald-800">
                تخصم الحصة من رصيد الطالب وتُحتسب فوراً كحصة منجزة ومستحقة في رصيد وراتب المعلم المسند (تسمع عند الطالب والمعلم معاً في نفس الوقت).
              </p>
            </div>

            {/* Fused Preset Selector + Custom Amount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={labelCls}>عدد الحصص المستهلكة</label>
                <span className="text-[11px] text-gray-400 font-normal">اختيار سريع أو إدخال يدوي</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {PRESET_AMOUNTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`min-w-[40px] h-9 px-2.5 rounded-xl text-xs font-bold font-mono border transition-all ${
                      Number(amount) === p
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <div className="flex-1 min-w-[90px]">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputCls} h-9 text-center font-mono`}
                    placeholder="مخصص"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <label className={labelCls}>مدة الحصة (بالدقائق)</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className={selectCls}
                >
                  <option value="30">30 دقيقة</option>
                  <option value="45">45 دقيقة</option>
                  <option value="60">60 دقيقة (ساعة كاملة)</option>
                  <option value="90">90 دقيقة (ساعة ونصف)</option>
                </select>
                <ChevronDown size={14} className="text-gray-400 absolute start-3 top-[38px] pointer-events-none" />
              </div>

              <div className="relative">
                <label className={labelCls}>تاريخ الحصة</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls}>المعلم المسند لحساب الحصة له</label>
                {primaryTeacher && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-lg font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    معلم الطالب في {recurringTeacher ? 'الجدول الدوري' : 'الاشتراك'}
                  </span>
                )}
              </div>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className={selectCls}
              >
                {!primaryTeacherId && <option value="">— اختر المعلم —</option>}
                {allTeacherOptions.map((t) => {
                  const isPrimary = t._id === primaryTeacherId
                  return (
                    <option key={t._id} value={t._id}>
                      {t.firstNameAr} {t.lastNameAr} {isPrimary ? ' ⭐ (معلم الطالب الحالي)' : ''}
                    </option>
                  )
                })}
              </select>
              <ChevronDown size={14} className="text-gray-400 absolute start-3 top-[38px] pointer-events-none" />
              <p className="text-[11px] text-gray-500 mt-1">
                {selectedTeacherId && selectedTeacherId === primaryTeacherId
                  ? 'تم تحديد معلم الطالب المعتمد تلقائياً، ويمكنك اختياره أو تغييره لأي معلم آخر إذا لزم الأمر.'
                  : 'يمكنك اختيار أي معلم بديل لاحتساب الحصة وراتبها في سجله.'}
              </p>
            </div>

            <div>
              <label className={labelCls}>سبب الاستهلاك *</label>
              <input
                type="text"
                placeholder="مثال: حصة تمت خارج النظام، تسجيل حضور يدوي معتمد للمحفظة..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Tab 1: Bonus */}
        {activeTab === 'bonus' && (
          <div className="space-y-3">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-950 space-y-1">
              <span className="font-bold block text-amber-900">منح حصة مكافأة (Bonus Lesson):</span>
              <p className="text-amber-800">
                تُمنح كحافز تشجيعي أو هدية للطالب المتميز، وتُضاف للمحفظة فوراً دون التأثير على اشتراك المعلم.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={labelCls}>عدد الحصص الممنوحة</label>
                <span className="text-[11px] text-gray-400 font-normal">اختيار سريع أو إدخال يدوي</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[1, 2, 3, 4, 5].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`min-w-[40px] h-9 px-2.5 rounded-xl text-xs font-bold font-mono border transition-all ${
                      Number(amount) === p
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    +{p}
                  </button>
                ))}
                <div className="flex-1 min-w-[90px]">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputCls} h-9 text-center font-mono`}
                    placeholder="مخصص"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>سبب المكافأة *</label>
              <input
                type="text"
                placeholder="مثال: تفوق الطالب في حفظ سورة البقرة، جائزة مسابقة الأكاديمية..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Compensation */}
        {activeTab === 'compensation' && (
          <div className="space-y-3">
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-950 space-y-1">
              <span className="font-bold block text-blue-900">منح حصة تعويضية (Compensation Lesson):</span>
              <p className="text-blue-800">
                لتعويض الطالب عن حصة ملغاة من طرف المعلم أو عطل تقني، وتُقيد كحصة تعويضية صريحة في السجل.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={labelCls}>عدد الحصص التعويضية</label>
                <span className="text-[11px] text-gray-400 font-normal">اختيار سريع أو إدخال يدوي</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`min-w-[40px] h-9 px-2.5 rounded-xl text-xs font-bold font-mono border transition-all ${
                      Number(amount) === p
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    +{p}
                  </button>
                ))}
                <div className="flex-1 min-w-[90px]">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputCls} h-9 text-center font-mono`}
                    placeholder="مخصص"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>سبب التعويض *</label>
              <input
                type="text"
                placeholder="مثال: تعويض عن غياب المعلم في حصة يوم الثلاثاء، انقطاع الاتصال..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Adjust */}
        {activeTab === 'adjust' && (
          <div className="space-y-3">
            <div className="bg-violet-50/70 border border-violet-200/80 rounded-xl p-3.5 text-xs text-violet-950 leading-relaxed space-y-1">
              <span className="font-bold block text-violet-900">تعديل رصيد المحفظة الإداري:</span>
              <p className="text-violet-800">
                يتيح إضافة رصيد أو خصمه. ملاحظة: خيار <span className="font-bold text-rose-700">«خصم رصيد (حصة مخصومة)»</span> يخصم من رصيد الطالب فقط دون احتسابها كحصة مستهلكة ودون إضافة أجر للمعلم. لاحتساب الحصة للمعلم يرجى استخدام تبويب <span className="font-bold text-emerald-700">«حصة مستهلكة»</span>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('credit')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  adjustmentType === 'credit'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                + إضافة رصيد (زيادة)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('debit')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  adjustmentType === 'debit'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                - خصم رصيد (حصة مخصومة فقط)
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className={labelCls}>عدد الحصص</label>
                <span className="text-[11px] text-gray-400 font-normal">اختيار سريع أو إدخال يدوي</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[1, 2, 4, 8, 12].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`min-w-[40px] h-9 px-2.5 rounded-xl text-xs font-bold font-mono border transition-all ${
                      Number(amount) === p
                        ? adjustmentType === 'credit' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {adjustmentType === 'credit' ? `+${p}` : `-${p}`}
                  </button>
                ))}
                <div className="flex-1 min-w-[90px]">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputCls} h-9 text-center font-mono`}
                    placeholder="مخصص"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>سبب التعديل المحاسبي *</label>
              <input
                type="text"
                placeholder="مثال: تسوية يدوية بناء على طلب ولي الأمر..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Freeze / Resume */}
        {activeTab === 'freeze' && (
          <div className="space-y-3">
            {isFrozen ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 space-y-2">
                <div className="font-bold text-sm text-red-900">المحفظة مجمدة حاليًا!</div>
                <p>سبب التجميد: {currentWallet?.freezeReason || 'غير محدد'}</p>
                {currentWallet?.frozenAt && <p>تاريخ التجميد: {new Date(currentWallet.frozenAt).toLocaleDateString('ar-EG')}</p>}
                <p className="font-semibold text-red-700 mt-2">
                  بالنقر على الزر أدناه، سيتم إلغاء التجميد فوراً وتمكين الطالب من حجز الحصص مجددًا.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900">
                  <span className="font-bold">تجميد المحفظة مؤقتًا:</span> يمنع الطالب من حجز حصص جديدة حتى يتم فك التجميد. الرصيد محفوظ بالكامل ولا يُفقد.
                </div>
                <div>
                  <label className={labelCls}>سبب التجميد *</label>
                  <input
                    type="text"
                    placeholder="مثال: سفر مؤقت، ظرف طارئ بطلب ولي الأمر..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>تاريخ الاستئناف التلقائي (اختياري)</label>
                  <input
                    type="date"
                    value={resumeAt}
                    onChange={(e) => setResumeAt(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
