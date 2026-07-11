import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import BackToTopButton from './BackToTopButton.jsx'
import WhatsAppFloatingButton from './WhatsAppFloatingButton.jsx'
import AiConciergeButton from './AiConciergeButton.jsx'
import AiConciergePanel from './AiConciergePanel.jsx'

// Mounted once in PublicLayout — ONE collapsed premium FAB (physical
// bottom-right; `right`, not logical `end`, since `end` mirrors to the
// left under this app's RTL layout and would drift to the opposite side
// from the AI panel it opens). Tap to expand a small vertical menu:
// AI Assistant, WhatsApp, Back to Top — tap again (or outside, or Escape,
// or a route change) to collapse. Opening the AI chat is a separate
// surface with its own close affordances (Escape/outside-click already
// handled inside AiConciergePanel) and its own conversation state, which
// persists across navigation — only the quick-action menu resets on route
// change, not an in-progress conversation.
const ITEMS_STAGGER = 0.045

export default function FloatingActionStack() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const conversationId = useMemo(() => crypto.randomUUID(), [])
  const reducedMotion = !!useReducedMotion()
  const rootRef = useRef(null)
  const location = useLocation()

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Route change closes the quick-action menu only — the chat conversation
  // (if open) is deliberately left alone so it survives navigation.
  useEffect(() => { closeMenu() }, [location.pathname, closeMenu])

  // Click/tap outside closes the menu.
  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) closeMenu()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen, closeMenu])

  // Escape closes the menu (the chat panel has its own independent Escape
  // handler for itself, scoped to when it — not this menu — is open).
  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(e) { if (e.key === 'Escape') closeMenu() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen, closeMenu])
function handleMainClick() {
  if (chatOpen) {
    setChatOpen(false)
    return
  }

  setMenuOpen(v => !v)
}

  function openChat() {
    setChatOpen(true)
    setMenuOpen(false)
  }

const items = [
  {
    key: 'ai',
    node: <AiConciergeButton open={chatOpen} onClick={openChat} />,
  },
  {
    key: 'whatsapp',
    node: <WhatsAppFloatingButton onNavigate={closeMenu} />,
  },
  {
    key: 'top',
    node: <BackToTopButton onNavigate={closeMenu} />,
  },
]

  const itemMotion = (index) => reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : {
      initial: { opacity: 0, y: 10, scale: 0.94 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 6, scale: 0.96 },
      transition: { duration: 0.22, delay: index * ITEMS_STAGGER, ease: [0.16, 1, 0.3, 1] },
    }

  return (
    <>
      <div
        ref={rootRef}
        className="fixed bottom-[calc(18px+env(safe-area-inset-bottom))] left-4 z-[999] flex flex-col items-start gap-4 md:bottom-7 md:left-7"
      >
        <AnimatePresence>
          {menuOpen && items.map((item, i) => (
            <motion.div key={item.key} {...itemMotion(i)}>
              {item.node}
            </motion.div>
          ))}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={handleMainClick}
          aria-label={chatOpen ? 'إغلاق المساعد الذكي' : (menuOpen ? 'إغلاق قائمة الإجراءات' : 'فتح قائمة الإجراءات')}
          aria-expanded={menuOpen || chatOpen}
          whileHover={reducedMotion ? undefined : { scale: 1.06, y: -2 }}
          whileTap={reducedMotion ? undefined : { scale: 0.95 }}
          className="relative flex h-[52px] w-[52px] md:h-14 md:w-14 items-center justify-center rounded-full text-white shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
           background: 'linear-gradient(135deg,#25D366,#128C7E)',
  boxShadow:
    '0 18px 40px rgba(37,211,102,.40), inset 0 1px 0 rgba(255,255,255,.15)',
  border: '1px solid rgba(255,255,255,.18)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  '--tw-ring-color': '#25D366',
  '--tw-ring-offset-color': '#0f0226',
          }}
        >
          <motion.span
            animate={{ scale: menuOpen ? 0.92 : 1 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex' }}
          >
            <MessageCircle size={28} strokeWidth={2.2} />
          </motion.span>
        </motion.button>
      </div>

      <AnimatePresence>
        {chatOpen && <AiConciergePanel onClose={() => setChatOpen(false)} conversationId={conversationId} />}
      </AnimatePresence>

      <style>{`
        .fab-item-label {
          align-items: center;
          white-space: nowrap;
          border-radius: 12px;
          padding: 8px 14px;
          font-size: 13.5px;
          font-weight: 600;
          color: #E7E0F5;
          background: rgba(15,2,38,0.88);
          border: 1px solid rgba(150,120,220,0.24);
          box-shadow: 0 8px 20px rgba(0,0,0,0.35);
        }
      `}</style>
    </>
  )
}
