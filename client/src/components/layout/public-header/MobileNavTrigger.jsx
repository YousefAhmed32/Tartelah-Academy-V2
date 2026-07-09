// Standalone hamburger trigger — kept separate from the auth actions so the
// mobile/desktop action clusters can evolve independently.
export default function MobileNavTrigger({ triggerRef, open, onOpen }) {
  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onOpen}
      aria-expanded={open}
      aria-controls="public-mobile-drawer"
      aria-label="فتح قائمة التنقل"
      className="relative z-10 grid h-11 w-11 flex-none place-items-center rounded-xl outline-none transition-colors duration-200 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-brand-gold/70 lg:hidden"
      style={{ border: '1px solid rgba(232,199,106,0.35)', background: 'rgba(255,255,255,0.04)' }}
    >
      <span className="relative block h-[13px] w-[18px]">
        <span className="absolute inset-x-0 top-0 h-[1.9px] rounded-full bg-[#E8C76A]" />
        <span className="absolute inset-x-0 top-1/2 h-[1.9px] -translate-y-1/2 rounded-full bg-[#E8C76A]" />
        <span className="absolute inset-x-0 bottom-0 h-[1.9px] rounded-full bg-[#E8C76A]" />
      </span>
    </button>
  )
}
