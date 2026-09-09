import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Wallet, ChevronRight } from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { payrollService } from '../../services/payroll.service.js'
import { formatCurrency } from '../../utils/format.js'
import { formatDateAr } from '../../utils/date.js'
import { ROUTES } from '../../config/constants.js'

const STATUS_LABELS = {
  open: { label: 'قيد التجميع', variant: 'gray' },
  pending_review: { label: 'بانتظار المراجعة', variant: 'warning' },
  approved: { label: 'معتمد', variant: 'blue' },
  paid: { label: 'مدفوع', variant: 'success' },
}
const TYPE_LABELS = {
  session_payable: 'حصة مستحقة', session_non_payable: 'حصة غير مستحقة', session_pending_review: 'حصة بانتظار المراجعة',
  bonus: 'مكافأة', penalty: 'خصم/جزاء', manual_adjustment: 'تسوية',
}

// Teacher self-service view of their own hourly payroll (Phase 2 §6) — read
// only, never any approve/pay/reopen action (those are admin-only; see
// AdminPayrollPage.jsx). Same single-file board/detail pattern.
export default function TeacherPayrollPage() {
  const { periodId } = useParams()
  return periodId ? <PeriodDetail periodId={periodId} /> : <PeriodsList />
}

function PeriodsList() {
  const navigate = useNavigate()
  const { data: current } = useQuery({ queryKey: ['teacher', 'payroll', 'current'], queryFn: () => payrollService.getMyCurrentPeriod().then(r => r.data.data) })
  const { data } = useQuery({ queryKey: ['teacher', 'payroll', 'periods'], queryFn: () => payrollService.getMyPeriods({ limit: 12 }).then(r => r.data.data) })
  const rows = data?.rows || []

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader title="راتبي" subtitle="حساب الراتب بالساعة: سعر الساعة × مدة الحصة المستحقة ÷ 60" />
      {current && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:border-violet-200" onClick={() => navigate(ROUTES.TEACHER_PAYROLL_PERIOD.replace(':periodId', current._id))}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-700">الفترة الحالية — {current.periodKey}</span>
            <Badge variant={STATUS_LABELS[current.status]?.variant}>{STATUS_LABELS[current.status]?.label}</Badge>
          </div>
          <div className="text-2xl font-bold text-violet-700">{formatCurrency(current.netPayable)}</div>
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">السجل الشهري</h3>
        {rows.map(p => (
          <button key={p._id} onClick={() => navigate(ROUTES.TEACHER_PAYROLL_PERIOD.replace(':periodId', p._id))}
            className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 text-right hover:border-violet-200">
            <div className="flex items-center gap-2">
              <Wallet size={15} className="text-violet-500" />
              <span className="font-semibold text-gray-800">{p.periodKey}</span>
              <Badge variant={STATUS_LABELS[p.status]?.variant}>{STATUS_LABELS[p.status]?.label}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{formatCurrency(p.netPayable)}</span>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </button>
        ))}
        {!rows.length && <div className="text-center py-10 text-gray-400 text-sm">لا يوجد سجل رواتب بعد</div>}
      </div>
    </div>
  )
}

function PeriodDetail({ periodId }) {
  const navigate = useNavigate()
  const { data: period, isLoading } = useQuery({ queryKey: ['teacher', 'payroll', 'period', periodId], queryFn: () => payrollService.getMyPeriod(periodId).then(r => r.data.data) })
  const { data: entries } = useQuery({ queryKey: ['teacher', 'payroll', 'period', periodId, 'entries'], queryFn: () => payrollService.getMyPeriodEntries(periodId).then(r => r.data.data), enabled: !!period })

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner color="border-brand-purple" /></div>
  if (!period) return <div className="text-center pt-20 text-gray-400">الفترة غير موجودة أو غير مصرح بالوصول إليها</div>

  return (
    <div dir="rtl" className="space-y-6 max-w-3xl">
      <PageHeader title={`راتب ${period.periodKey}`} subtitle="حساب الراتب بالساعة: سعر الساعة × المدة المستحقة ÷ 60"
        actions={<Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.TEACHER_PAYROLL)}>رجوع</Button>} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <Badge variant={STATUS_LABELS[period.status]?.variant}>{STATUS_LABELS[period.status]?.label}</Badge>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-gray-400">المستحق الأساسي</div><div className="font-bold text-gray-900">{formatCurrency(period.grossEntitlement)}</div></div>
          <div><div className="text-xs text-gray-400">المكافآت</div><div className="font-bold text-emerald-600">{formatCurrency(period.bonusesTotal)}</div></div>
          <div><div className="text-xs text-gray-400">الخصومات</div><div className="font-bold text-red-600">{formatCurrency(period.deductionsTotal)}</div></div>
          <div><div className="text-xs text-gray-400">التسويات</div><div className="font-bold text-gray-700">{formatCurrency(period.settlementsTotal)}</div></div>
        </div>
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-500">صافي المستحق</span>
          <span className="text-xl font-bold text-violet-700">{formatCurrency(period.netPayable)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">تفاصيل الحصص والحركات</h3>
        {(entries || []).map(e => (
          <div key={e._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5">
            <div className="flex items-center gap-2">
              <Badge variant="gray">{TYPE_LABELS[e.type] || e.type}</Badge>
              <span className={`font-bold ${e.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{e.amount >= 0 ? '+' : ''}{formatCurrency(e.amount)}</span>
              {e.type === 'session_payable' && <span className="text-[11px] text-gray-400">({formatCurrency(e.hourlyRateSnapshot)} × {e.payableDurationMinutes} د ÷ 60)</span>}
            </div>
            <p className="text-xs text-gray-500 mt-1">{e.reason}</p>
            <p className="text-[11px] text-gray-400 mt-1">{formatDateAr(e.createdAt)}</p>
          </div>
        ))}
        {!entries?.length && <div className="text-center py-8 text-gray-400 text-sm">لا توجد حركات</div>}
      </div>
    </div>
  )
}
