import { Sparkles } from 'lucide-react'

// A menu item inside the unified FloatingActionStack. `open` reflects
// whether the AI chat panel is currently open (the launcher's active state
// must be visible per spec) — the parent stack decides what "click" means
// (open the panel and collapse the menu), this component only renders.
export default function AiConciergeButton({ open, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-ai-cluster-trigger
      aria-label={open ? 'إغلاق مساعد ترتيلة الذكي' : 'فتح المساعد الذكي'}
      aria-expanded={open}
      title="المساعد الذكي"
      className="group flex items-center gap-3 outline-none"
    >
      <span
        className={`fab-item-icon flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:scale-[1.05] group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-offset-2 ${open ? 'ring-2' : 'ring-1 ring-white/10'}`}
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
          boxShadow: open ? '0 0 0 4px rgba(232,199,106,0.25), 0 8px 22px rgba(124,58,237,0.5)' : '0 8px 22px rgba(124,58,237,0.4)',
          '--tw-ring-color': '#E8C76A',
          '--tw-ring-offset-color': '#0f0226',
        }}
      >
        <Sparkles size={20} strokeWidth={1.8} />
      </span>
      <span className="fab-item-label hidden md:inline-flex">المساعد الذكي</span>
    </button>
  )
}
