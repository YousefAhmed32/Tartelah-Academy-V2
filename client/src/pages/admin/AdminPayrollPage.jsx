import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Wallet, CheckCircle2, BadgeCheck, RotateCcw, Download, ChevronRight, Plus, Undo2, Clock,
} from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { payrollService } from '../../services/payroll.service.js'
import { formatCurrency, formatNumber } from '../../utils/format.js'
import { formatDateAr } from '../../utils/date.js'
import { exportRowsToCSV } from '../../utils/exportUtils.js'
import { ROUTES } from '../../config/constants.js'
import { useAuthStore } from '../../store/authStore.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

const STATUS_LABELS = {
  open: { label: 'مفتوحة', variant: 'gray' },
  pending_review: { label: 'بانتظار المراجعة', variant: 'warning' },
  approved: { label: 'معتمدة', variant: 'blue' },
  paid: { label: 'مدفوعة', variant: 'success' },
}

const TYPE_LABELS = {
  session_payable: 'حصة مستحقة', session_non_payable: 'حصة غير مستحقة', session_pending_review: 'حصة بانتظار المراجعة',
  bonus: 'مكافأة', penalty: 'خصم/جزاء', manual_adjustment: 'تسوية يدوية',
}

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

// Hourly teacher payroll board (Phase 2 §6). Same single-file,
// step-by-param pattern as AdminTeacherReplacementPage.jsx: no :periodId ->
// the org-wide monthly board; a real :periodId -> that one period's detail
// (entries, adjustment form, approve/pay/reopen actions).
export default function AdminPayrollPage() {
  const { periodId } = useParams()
  return periodId ? <PeriodDetail periodId={periodId} /> : <PayrollBoard />
}

// ── Board — one row per active teacher for a selected month ────────────────

function PayrollBoard() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const { hasPermission } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payroll', 'periods', year, month],
    queryFn: () => payrollService.listOrgPeriods(year, month, { limit: 100 }).then(r => r.data.data),
  })

  const rows = data?.rows || []
  const totals = rows.reduce((acc, r) => ({
    gross: acc.gross + (r.grossEntitlement || 0), net: acc.net + (r.netPayable || 0),
    pendingReview: acc.pendingReview + (r.status === 'pending_review' ? 1 : 0),
    approved: acc.approved + (r.status === 'approved' ? 1 : 0),
    paid: acc.paid + (r.status === 'paid' ? 1 : 0),
  }), { gross: 0, net: 0, pendingReview: 0, approved: 0, paid: 0 })

  const exportBoard = () => {
    exportRowsToCSV(rows, [
      { key: 'teacherId', label: 'المعلم', format: (v) => `${v?.firstNameAr || ''} ${v?.lastNameAr || ''}` },
      { key: 'grossEntitlement', label: 'المستحق الأساسي' },
      { key: 'bonusesTotal', label: 'المكافآت' },
      { key: 'deductionsTotal', label: 'الخصومات' },
      { key: 'settlementsTotal', label: 'التسويات' },
      { key: 'netPayable', label: 'صافي المستحق' },
      { key: 'status', label: 'الحالة', format: (v) => STATUS_LABELS[v]?.label || v },
    ], `الرواتب-${year}-${month}`)
  }

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader title="الرواتب" subtitle={`رواتب المعلمين بالساعة — ${MONTHS_AR[month - 1]} ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <select className={`${inputCls} w-auto`} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS_AR.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className={`${inputCls} w-auto`} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={exportBoard}>تصدير</Button>
          </div>
        } />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي المستحق الأساسي', value: totals.gross, icon: <Wallet size={16} /> },
          { label: 'صافي المستحق', value: totals.net, icon: <BadgeCheck size={16} /> },
          { label: 'بانتظار المراجعة', value: totals.pendingReview, plain: true },
          { label: 'معتمدة', value: totals.approved, plain: true },
          { label: 'مدفوعة', value: totals.paid, plain: true },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs text-gray-400 font-semibold mb-1">{s.label}</div>
            <div className="text-lg font-bold text-gray-900">{s.plain ? formatNumber(s.value) : formatCurrency(s.value)}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
        ) : !rows.length ? (
          <div className="text-center py-16 text-gray-400 text-sm">لا يوجد معلمون نشطون</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-right font-bold">المعلم</th>
                  <th className="px-4 py-3 text-right font-bold">سعر الساعة</th>
                  <th className="px-4 py-3 text-right font-bold">المستحق الأساسي</th>
                  <th className="px-4 py-3 text-right font-bold">صافي المستحق</th>
                  <th className="px-4 py-3 text-right font-bold">الحالة</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50/60 cursor-pointer" onClick={() => navigate(ROUTES.ADMIN_PAYROLL_PERIOD.replace(':periodId', r._id))}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={r.teacherId?.avatar} firstName={r.teacherId?.firstNameAr} lastName={r.teacherId?.lastNameAr} size="sm" />
                        <span className="font-semibold text-gray-800">{r.teacherId?.firstNameAr} {r.teacherId?.lastNameAr}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(r.hourlyRate)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(r.grossEntitlement)}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(r.netPayable)}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_LABELS[r.status]?.variant}>{STATUS_LABELS[r.status]?.label}</Badge></td>
                    <td className="px-4 py-3 text-left"><ChevronRight size={16} className="text-gray-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!hasPermission('payroll.approve') && (
        <p className="text-xs text-gray-400">اعتماد الفترات وصرفها يتطلب صلاحية إضافية غير ممنوحة لحسابك حاليًا.</p>
      )}
    </div>
  )
}

// ── Period detail — entries, adjustments, lifecycle actions ────────────────

function AdjustmentModal({ teacherId, periodStatus, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: 'bonus', amount: '', reason: '' })
  const mut = useMutation({
    mutationFn: () => payrollService.createAdjustment(teacherId, { type: form.type, amount: Number(form.amount), reason: form.reason }),
    onSuccess: () => { toast.success('تم تسجيل الحركة المالية'); qc.invalidateQueries({ queryKey: ['admin', 'payroll'] }); onClose() },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })
  return (
    <Modal open onClose={onClose} title="إضافة حركة مالية"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button variant="purple" loading={mut.isPending} disabled={!form.amount || !form.reason.trim()} onClick={() => mut.mutate()}>حفظ</Button>
      </>}>
      <div className="space-y-4" dir="rtl">
        {periodStatus !== 'open' && periodStatus !== 'pending_review' && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-2.5">هذه الفترة معتمدة أو مدفوعة — سيتم تسجيل الحركة في الفترة المفتوحة الحالية بدلًا منها.</p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {[['bonus', 'مكافأة'], ['penalty', 'خصم'], ['manual_adjustment', 'تسوية']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setForm(p => ({ ...p, type: v }))}
              className={`h-10 rounded-xl text-xs font-bold border ${form.type === v ? 'bg-violet-600 border-violet-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>{l}</button>
          ))}
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">القيمة {form.type === 'manual_adjustment' ? '(موجب أو سالب)' : ''}</label>
          <input type="number" className={inputCls} value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">السبب (إلزامي)</label>
          <textarea className={`${inputCls} h-20 py-2 resize-none`} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
        </div>
      </div>
    </Modal>
  )
}

function PeriodDetail({ periodId }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuthStore()
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [reopenOpen, setReopenOpen] = useState(false)
  const [payReference, setPayReference] = useState('')
  const [payOpen, setPayOpen] = useState(false)

  const { data: period, isLoading } = useQuery({
    queryKey: ['admin', 'payroll', 'period', periodId],
    queryFn: () => payrollService.getPeriod(periodId).then(r => r.data.data),
  })
  const { data: entries } = useQuery({
    queryKey: ['admin', 'payroll', 'period', periodId, 'entries'],
    queryFn: () => payrollService.getPeriodEntries(periodId).then(r => r.data.data),
    enabled: !!period,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'payroll'] })
  const submitMut = useMutation({ mutationFn: () => payrollService.submitPeriod(periodId), onSuccess: () => { toast.success('تم الإرسال للمراجعة'); invalidate() }, onError: (e) => toast.error(e.response?.data?.message || 'خطأ') })
  const approveMut = useMutation({ mutationFn: () => payrollService.approvePeriod(periodId), onSuccess: () => { toast.success('تم اعتماد الفترة'); invalidate() }, onError: (e) => toast.error(e.response?.data?.message || 'خطأ') })
  const payMut = useMutation({
    mutationFn: () => payrollService.markPeriodPaid(periodId, { reference: payReference }),
    onSuccess: () => { toast.success('تم تحديد الفترة كمدفوعة'); setPayOpen(false); invalidate() },
    onError: (e) => toast.error(e.response?.data?.message || 'خطأ'),
  })
  const reopenMut = useMutation({
    mutationFn: () => payrollService.reopenPeriod(periodId, reopenReason),
    onSuccess: () => { toast.success('تمت إعادة فتح الفترة'); setReopenOpen(false); setReopenReason(''); invalidate() },
    onError: (e) => toast.error(e.response?.data?.message || 'خطأ'),
  })
  const reverseMut = useMutation({
    mutationFn: (entryId) => payrollService.reverseAdjustment(entryId, 'عكس من صفحة الرواتب'),
    onSuccess: () => { toast.success('تم عكس الحركة'); invalidate() },
    onError: (e) => toast.error(e.response?.data?.message || 'خطأ'),
  })

  const exportEntries = () => {
    exportRowsToCSV(entries || [], [
      { key: 'createdAt', label: 'التاريخ', format: (v) => formatDateAr(v) },
      { key: 'type', label: 'النوع', format: (v) => TYPE_LABELS[v] || v },
      { key: 'hourlyRateSnapshot', label: 'سعر الساعة' },
      { key: 'payableDurationMinutes', label: 'المدة المستحقة (دقيقة)' },
      { key: 'amount', label: 'القيمة' },
      { key: 'reason', label: 'السبب' },
    ], `سجل-الراتب-${period?.periodKey || periodId}`)
  }

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner color="border-brand-purple" /></div>
  if (!period) return <div className="text-center pt-20 text-gray-400">الفترة غير موجودة</div>

  return (
    <div dir="rtl" className="space-y-6 max-w-6xl">
      <PageHeader
        title={`راتب ${period.teacherId?.firstNameAr || ''} ${period.teacherId?.lastNameAr || ''} — ${period.periodKey}`}
        subtitle="حساب الراتب بالساعة: سعر الساعة × المدة المستحقة ÷ 60"
        actions={<Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ADMIN_PAYROLL)}>رجوع للرواتب</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <Badge variant={STATUS_LABELS[period.status]?.variant}>{STATUS_LABELS[period.status]?.label}</Badge>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-xs text-gray-500">المستحق الأساسي</div><div className="font-bold text-gray-900">{formatCurrency(period.grossEntitlement)}</div></div>
            <div><div className="text-xs text-gray-500">المكافآت</div><div className="font-bold text-emerald-600">{formatCurrency(period.bonusesTotal)}</div></div>
            <div><div className="text-xs text-gray-500">الخصومات</div><div className="font-bold text-red-600">{formatCurrency(period.deductionsTotal)}</div></div>
            <div><div className="text-xs text-gray-500">التسويات</div><div className="font-bold text-gray-700">{formatCurrency(period.settlementsTotal)}</div></div>
          </div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-500">صافي المستحق</span>
            <span className="text-xl font-bold text-violet-700">{formatCurrency(period.netPayable)}</span>
          </div>

          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <Button variant="outline" size="sm" icon={<Plus size={13} />} onClick={() => setAdjustOpen(true)}>إضافة حركة مالية</Button>
            <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={exportEntries}>تصدير</Button>
            {['open'].includes(period.status) && (
              <Button variant="outline" size="sm" icon={<Clock size={13} />} loading={submitMut.isPending} onClick={() => submitMut.mutate()}>إرسال للمراجعة</Button>
            )}
            {['open', 'pending_review'].includes(period.status) && hasPermission('payroll.approve') && (
              <Button variant="purple" size="sm" icon={<CheckCircle2 size={13} />} loading={approveMut.isPending} onClick={() => approveMut.mutate()}>اعتماد</Button>
            )}
            {period.status === 'approved' && hasPermission('payroll.pay') && (
              <Button variant="purple" size="sm" icon={<BadgeCheck size={13} />} onClick={() => setPayOpen(true)}>تحديد كمدفوعة</Button>
            )}
            {['approved', 'paid'].includes(period.status) && hasPermission('payroll.approve') && (
              <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={() => setReopenOpen(true)}>إعادة فتح</Button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-2">
          <h3 className="text-sm font-bold text-gray-700">الحركات المالية</h3>
          {(entries || []).map(e => (
            <div key={e._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="gray">{TYPE_LABELS[e.type] || e.type}</Badge>
                  <span className={`font-bold ${e.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{e.amount >= 0 ? '+' : ''}{formatCurrency(e.amount)}</span>
                  {e.type === 'session_payable' && (
                    <span className="text-[11px] text-gray-500">({formatCurrency(e.hourlyRateSnapshot)} × {e.payableDurationMinutes} د ÷ 60)</span>
                  )}
                </div>
                {['bonus', 'penalty', 'manual_adjustment'].includes(e.type) && !e.supersededBy && hasPermission('payroll.manage') && (
                  <Button variant="ghost" size="sm" icon={<Undo2 size={12} />} loading={reverseMut.isPending} onClick={() => reverseMut.mutate(e._id)}>عكس</Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{e.reason}</p>
              <p className="text-[11px] text-gray-500 mt-1">{formatDateAr(e.createdAt)}</p>
            </div>
          ))}
          {!entries?.length && <div className="text-center py-8 text-gray-500 text-sm">لا توجد حركات بعد</div>}
        </div>
      </div>

      {adjustOpen && <AdjustmentModal teacherId={period.teacherId?._id || period.teacherId} periodStatus={period.status} onClose={() => setAdjustOpen(false)} />}

      {payOpen && (
        <Modal open onClose={() => setPayOpen(false)} title="تحديد الفترة كمدفوعة"
          footer={<><Button variant="ghost" onClick={() => setPayOpen(false)}>إلغاء</Button><Button variant="purple" loading={payMut.isPending} onClick={() => payMut.mutate()}>تأكيد</Button></>}>
          <div dir="rtl">
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">مرجع الدفع (اختياري)</label>
            <input className={inputCls} value={payReference} onChange={e => setPayReference(e.target.value)} placeholder="رقم التحويل البنكي مثلًا" />
          </div>
        </Modal>
      )}

      {reopenOpen && (
        <Modal open onClose={() => setReopenOpen(false)} title="إعادة فتح الفترة"
          footer={<><Button variant="ghost" onClick={() => setReopenOpen(false)}>إلغاء</Button><Button variant="purple" loading={reopenMut.isPending} disabled={!reopenReason.trim()} onClick={() => reopenMut.mutate()}>تأكيد إعادة الفتح</Button></>}>
          <div dir="rtl">
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">سبب إعادة الفتح (إلزامي)</label>
            <textarea className={`${inputCls} h-20 py-2 resize-none`} value={reopenReason} onChange={e => setReopenReason(e.target.value)} />
          </div>
        </Modal>
      )}
    </div>
  )
}
