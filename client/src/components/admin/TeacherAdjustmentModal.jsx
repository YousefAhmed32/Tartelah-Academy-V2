import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Gift, ShieldAlert, Clock, AlertCircle, Calendar } from 'lucide-react'
import { payrollService } from '../../services/payroll.service.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { formatCurrency } from '../../utils/format.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const labelCls = 'text-xs font-bold text-gray-500 mb-1.5 block'

const TABS = [
  { key: 'bonus', label: 'مكافأة مالية', icon: Gift, color: 'text-emerald-600', activeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { key: 'penalty', label: 'خصم / جزاء', icon: ShieldAlert, color: 'text-rose-600', activeBg: 'bg-rose-50 text-rose-800 border-rose-300' },
  { key: 'session', label: 'إضافة / خصم حصة', icon: Clock, color: 'text-violet-600', activeBg: 'bg-violet-50 text-violet-800 border-violet-300' },
]

export default function TeacherAdjustmentModal({
  open,
  onClose,
  teacherId,
  teacherName = 'المعلم',
  hourlyRate = 0,
}) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('bonus')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  
  // Session calculation mode
  const [sessionAction, setSessionAction] = useState('bonus') // 'bonus' (add) or 'penalty' (deduct)
  const [sessionCount, setSessionCount] = useState(1)
  const [sessionDuration, setSessionDuration] = useState(60)

  // Period (current month by default)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    if (open) {
      setAmount('')
      setReason('')
      setSessionCount(1)
      setSessionDuration(60)
      setSessionAction('bonus')
      setYear(now.getFullYear())
      setMonth(now.getMonth() + 1)
    }
  }, [open, activeTab])

  // Automatically compute amount if in session mode
  useEffect(() => {
    if (activeTab === 'session') {
      const rate = Number(hourlyRate) || 0
      const calculated = Math.round(sessionCount * (sessionDuration / 60) * rate)
      setAmount(calculated > 0 ? calculated : '')
    }
  }, [activeTab, sessionCount, sessionDuration, hourlyRate])

  const mut = useMutation({
    mutationFn: async () => {
      const trimmedReason = reason.trim()
      if (!trimmedReason) throw new Error('يرجى كتابة سبب الإجراء المالي')

      const numAmount = Number(amount)
      if (!numAmount || numAmount <= 0) throw new Error('يرجى إدخال مبلغ صحيح أكبر من الصفر')

      const type = activeTab === 'session' ? sessionAction : activeTab

      return payrollService.createAdjustment(teacherId, {
        type,
        amount: numAmount,
        reason: trimmedReason,
        year: Number(year),
        month: Number(month),
      })
    },
    onSuccess: (res) => {
      const isBonus = (activeTab === 'session' ? sessionAction : activeTab) === 'bonus'
      toast.success(isBonus ? 'تم إضافة المكافأة بنجاح' : 'تم تسجيل الخصم بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'payroll', 'teacher-periods', teacherId] })
      qc.invalidateQueries({ queryKey: ['admin', 'payroll', 'adjustments', teacherId] })
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile', teacherId] })
      onClose()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'حدث خطأ أثناء حفظ الإجراء')
    },
  })

  const quickReasons = {
    bonus: [
      'مكافأة أداء متميز وحسن التزام',
      'مكافأة إتمام ختمة قرآنية مع طالب',
      'تعويض عن تدريس إضافي استثنائي',
    ],
    penalty: [
      'خصم تأخير متكرر عن مواعيد الحصص',
      'خصم غياب غير مبرر عن حصة مجدولة',
      'تسوية فروقات مالية سابقة',
    ],
    session: [
      'مكافأة تدريس حصة فردية إضافية',
      'خصم حصة ملغاة من طرف المعلم بدون عذر',
      'تسوية مدة حصة تعويضية',
    ],
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`إجراء مالي لمعلم: ${teacherName}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={onClose} disabled={mut.isPending}>
            إلغاء
          </Button>
          <Button
            variant={activeTab === 'penalty' || (activeTab === 'session' && sessionAction === 'penalty') ? 'danger' : 'purple'}
            onClick={() => mut.mutate()}
            loading={mut.isPending}
          >
            تأكيد وتسجيل الإجراء
          </Button>
        </div>
      }
    >
      <div className="space-y-4" dir="rtl">
        {/* Tab selection */}
        <div className="grid grid-cols-3 gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1.5 ${
                  isActive ? tab.activeBg : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} className={isActive ? 'currentColor' : tab.color} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Rate Info Banner */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between text-xs">
          <span className="text-gray-500">سعر ساعة المعلم المعتمد:</span>
          <span className="font-bold text-gray-900" dir="ltr">
            {hourlyRate ? formatCurrency(hourlyRate, 'EGP') : 'غير محدد (0 EGP)'}
          </span>
        </div>

        {/* Session mode options */}
        {activeTab === 'session' && (
          <div className="bg-violet-50/70 border border-violet-100 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-violet-900">نوع تأثير الحصة:</span>
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-violet-100">
                <button
                  type="button"
                  onClick={() => setSessionAction('bonus')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    sessionAction === 'bonus' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600'
                  }`}
                >
                  + إضافة حصة (مكافأة)
                </button>
                <button
                  type="button"
                  onClick={() => setSessionAction('penalty')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    sessionAction === 'penalty' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-600'
                  }`}
                >
                  - خصم حصة (جزاء)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>عدد الحصص</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className={inputCls}
                  value={sessionCount}
                  onChange={(e) => setSessionCount(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div>
                <label className={labelCls}>مدة الحصة</label>
                <select
                  className={inputCls}
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Number(e.target.value))}
                >
                  <option value={30}>30 دقيقة (نصف ساعة)</option>
                  <option value={45}>45 دقيقة</option>
                  <option value={60}>60 دقيقة (ساعة كاملة)</option>
                  <option value={90}>90 دقيقة (ساعة ونصف)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Amount & Period */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>
              {activeTab === 'bonus' || (activeTab === 'session' && sessionAction === 'bonus') ? 'المبلغ المضاف (ج.م)' : 'المبلغ المخصوم (ج.م)'}
            </label>
            <input
              type="number"
              min="1"
              step="1"
              className={inputCls}
              placeholder="مثال: 150"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>شهر الراتب (الفترة المستهدفة)</label>
            <div className="grid grid-cols-2 gap-1.5">
              <select className={inputCls} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>شهر {m}</option>
                ))}
              </select>
              <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label className={labelCls}>
            سبب الإجراء <span className="text-rose-500">* (مطلوب للشفافية وتوثيق السجل)</span>
          </label>
          <textarea
            className={`${inputCls} h-20 resize-none py-2`}
            placeholder="اكتب سبب المكافأة أو الخصم بالتفصيل ليظهر للمعلم وفي تقارير الرواتب..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Quick reasons */}
        <div>
          <span className="text-[11px] font-bold text-gray-400 mb-1.5 block">أسباب سريعة مقترحة:</span>
          <div className="flex flex-wrap gap-1.5">
            {(quickReasons[activeTab] || []).map((qr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReason(qr)}
                className="text-[11px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg transition-colors text-right"
              >
                + {qr}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
