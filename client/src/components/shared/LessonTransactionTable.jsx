import Badge from '../ui/Badge.jsx'
import EmptyState from './EmptyState.jsx'
import { formatDateAr, formatTimeAr } from '../../utils/date.js'
import { formatNumber, toArray } from '../../utils/format.js'

const TYPE_CONFIG = {
  purchase: { label: 'شراء', badge: 'success' },
  renewal: { label: 'تجديد', badge: 'success' },
  consumption: { label: 'استهلاك', badge: 'gray' },
  reversal: { label: 'إرجاع', badge: 'blue' },
  refund: { label: 'استرداد', badge: 'warning' },
  bonus: { label: 'حصة إضافية', badge: 'gold' },
  compensation: { label: 'حصة تعويضية', badge: 'purple' },
  freeze: { label: 'تجميد', badge: 'blue' },
  unfreeze: { label: 'إلغاء تجميد', badge: 'blue' },
  transfer_in: { label: 'تحويل وارد', badge: 'success' },
  transfer_out: { label: 'تحويل صادر', badge: 'warning' },
  manual_adjustment: { label: 'تعديل يدوي', badge: 'purple' },
  admin_edit: { label: 'تصحيح إداري', badge: 'purple' },
  migration_import: { label: 'استيراد من النظام القديم', badge: 'gray' },
}

// Read-only ledger view — every LessonTransaction is immutable, so this
// table IS the audit trail (see ARCHITECTURE_PLAN.md's Lesson Wallet
// section: "every lesson movement must create a transaction, nothing
// changes silently").
export default function LessonTransactionTable({ transactions }) {
  const rows = toArray(transactions)
  if (!rows.length) {
    return <EmptyState title="لا توجد حركات على المحفظة بعد" description="ستظهر هنا كل عملية شراء أو استهلاك أو تعديل على رصيد الحصص" />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead>
          <tr className="border-b border-[#f0ecf8]">
            {['التاريخ', 'النوع', 'الكمية', 'الرصيد بعدها', 'السبب'].map(h => (
              <th key={h} className="text-right px-4 py-2.5 text-xs font-semibold text-[#7c6aaa] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(tx => {
            const cfg = TYPE_CONFIG[tx.type] || { label: tx.type, badge: 'gray' }
            const isCredit = tx.amount > 0
            return (
              <tr key={tx._id} className="border-b border-[#f8f5ff]">
                <td className="px-4 py-2.5 text-xs text-[#7c6aaa] whitespace-nowrap">
                  {formatDateAr(tx.createdAt)} · {formatTimeAr(tx.createdAt)}
                </td>
                <td className="px-4 py-2.5"><Badge variant={cfg.badge}>{cfg.label}</Badge></td>
                <td className={`px-4 py-2.5 text-sm font-bold ${isCredit ? 'text-emerald-600' : tx.amount < 0 ? 'text-red-500' : 'text-[#7c6aaa]'}`}>
                  {tx.amount > 0 ? '+' : ''}{formatNumber(tx.amount)}
                </td>
                <td className="px-4 py-2.5 text-sm text-brand-textBody">{formatNumber(tx.balanceAfter)}</td>
                <td className="px-4 py-2.5 text-xs text-[#7c6aaa] max-w-[220px] truncate">{tx.reason || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
