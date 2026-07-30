import { motion } from 'framer-motion'
import { formatNumber } from '../../utils/format.js'

const BREAKDOWN_ITEMS = [
  { key: 'totalPurchased', label: 'إجمالي المشترى', color: '#7c3aed' },
  { key: 'totalUsed', label: 'المستهلك', color: '#9b7fd6' },
  { key: 'bonusLessons', label: 'حصص إضافية', color: '#E8C76A' },
  { key: 'compensationLessons', label: 'حصص تعويضية', color: '#22c55e' },
  { key: 'frozenLessons', label: 'مجمّدة', color: '#3b82f6' },
]

// Lesson Wallet balance breakdown — the redesign's core visualization: the
// student's rights come from this wallet, not from a subscription's
// calendar dates (see ARCHITECTURE_PLAN.md's Lesson Wallet section).
export default function WalletBalanceCard({ wallet }) {
  if (!wallet) return null
  const isFrozen = wallet.status === 'frozen'

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="card-light overflow-hidden">
      <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #1d0a3f 0%, #2e1065 100%)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[12px] font-semibold mb-1" style={{ color: 'rgba(167,143,214,0.7)' }}>محفظة الحصص</div>
            <div className="font-heading font-extrabold text-4xl text-white">
              {formatNumber(wallet.remaining || 0)}
              <span className="text-base font-semibold text-[#a78fd6] mr-2">حصة متبقية</span>
            </div>
          </div>
          {isFrozen && (
            <div className="px-3 py-1.5 rounded-full text-xs font-bold flex-none" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.4)' }}>
              مجمّدة مؤقتاً
            </div>
          )}
        </div>
        {isFrozen && wallet.freezeReason && (
          <div className="text-xs text-[#a78fd6] mt-2">السبب: {wallet.freezeReason}</div>
        )}
      </div>

      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {BREAKDOWN_ITEMS.map(item => (
          <div key={item.key} className="p-4 rounded-[14px]" style={{ background: '#f8f5ff' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full flex-none" style={{ background: item.color }} />
              <span className="text-xs text-[#9b7fd6]">{item.label}</span>
            </div>
            <div className="font-heading font-bold text-brand-textBody">{formatNumber(wallet[item.key] || 0)}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
