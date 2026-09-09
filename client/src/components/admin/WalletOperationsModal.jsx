import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Gift, ShieldAlert, SlidersHorizontal, Snowflake, Play, Sparkles, AlertCircle } from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Spinner from '../ui/Spinner.jsx'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'
const labelCls = 'text-xs font-bold text-gray-500 mb-1.5 block'

const TABS = [
  { key: 'bonus', label: 'مكافأة حصص', icon: Gift, color: 'text-amber-600', activeBg: 'bg-amber-50 text-amber-800 border-amber-300' },
  { key: 'compensation', label: 'حصص تعويضية', icon: ShieldAlert, color: 'text-blue-600', activeBg: 'bg-blue-50 text-blue-800 border-blue-300' },
  { key: 'adjust', label: 'تعديل الرصيد', icon: SlidersHorizontal, color: 'text-violet-600', activeBg: 'bg-violet-50 text-violet-800 border-violet-300' },
  { key: 'freeze', label: 'تجميد / فك التجميد', icon: Snowflake, color: 'text-sky-600', activeBg: 'bg-sky-50 text-sky-800 border-sky-300' },
]

export default function WalletOperationsModal({
  open,
  onClose,
  studentId,
  studentName = 'الطالب',
  currentWallet = null,
}) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('bonus')
  const [amount, setAmount] = useState(1)
  const [adjustmentType, setAdjustmentType] = useState('credit') // 'credit' (+), 'debit' (-)
  const [reason, setReason] = useState('')
  const [resumeAt, setResumeAt] = useState('')

  const isFrozen = !!currentWallet?.isFrozen

  useEffect(() => {
    if (open) {
      setAmount(1)
      setReason('')
      setResumeAt('')
      setAdjustmentType('credit')
    }
  }, [open, activeTab])

  const opMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim() && activeTab !== 'freeze' && !isFrozen) {
        throw new Error('يرجى كتابة سبب العملية')
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
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" onClick={onClose} disabled={opMutation.isPending}>
            إلغاء
          </Button>
          <Button
            variant={activeTab === 'freeze' && isFrozen ? 'success' : 'purple'}
            loading={opMutation.isPending}
            onClick={() => opMutation.mutate()}
          >
            {activeTab === 'freeze' ? (isFrozen ? 'فك تجميد المحفظة الآن' : 'تأكيد تجميد المحفظة') : 'تأكيد تنفيذ العملية'}
          </Button>
        </div>
      }
    >
      <div dir="rtl" className="space-y-4">
        {/* Current status pill */}
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-semibold">الرصيد المتاح:</span>
            <span className="font-bold text-gray-900 text-sm">
              {currentWallet?.balance != null ? `${currentWallet.balance} حصة` : '—'}
            </span>
            {currentWallet?.bonusLessons > 0 && (
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">
                +{currentWallet.bonusLessons} مكافأة
              </span>
            )}
            {currentWallet?.compensationLessons > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                +{currentWallet.compensationLessons} تعويض
              </span>
            )}
          </div>
          <span className={`px-2.5 py-1 rounded-full font-bold ${isFrozen ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
            {isFrozen ? 'المحفظة مجمدة' : 'المحفظة نشطة'}
          </span>
        </div>

        {/* Operation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-gray-100 rounded-xl">
          {TABS.map((t) => {
            const Icon = t.icon
            const isActive = activeTab === t.key
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  isActive ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={14} className={t.color} />
                <span className="truncate">{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab 1: Bonus */}
        {activeTab === 'bonus' && (
          <div className="space-y-3">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900">
              <span className="font-bold">منح حصة مكافأة (Bonus Lesson):</span> تُمنح كحافز تشجيعي أو هدية للطالب المتميز، وتُضاف للمحفظة فوراً دون التأثير على اشتراك المعلم.
            </div>
            <div>
              <label className={labelCls}>عدد الحصص الممنوحة</label>
              <input
                type="number"
                min="1"
                max="20"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputCls}
              />
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
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900">
              <span className="font-bold">منح حصة تعويضية (Compensation Lesson):</span> لتعويض الطالب عن حصة ملغاة من طرف المعلم أو عطل تقني، وتُقيد كحصة تعويضية صريحة في السجل.
            </div>
            <div>
              <label className={labelCls}>عدد الحصص التعويضية</label>
              <input
                type="number"
                min="1"
                max="20"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputCls}
              />
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
            <div className="bg-violet-50/70 border border-violet-200/80 rounded-xl p-3 text-xs text-violet-900">
              <span className="font-bold">تعديل رصيد المحفظة (Manual Adjustment):</span> يتم توثيق التعديل بدقة كمعاملة محاسبية مستقلة في سجل حركات المحفظة دون التلاعب السري بالأرقام.
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('credit')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  adjustmentType === 'credit'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                + إضافة رصيد (زيادة)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('debit')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                  adjustmentType === 'debit'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                - خصم رصيد (إنقاص)
              </button>
            </div>
            <div>
              <label className={labelCls}>عدد الحصص</label>
              <input
                type="number"
                min="1"
                max="50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputCls}
              />
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
