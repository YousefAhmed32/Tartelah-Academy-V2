import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import WhatsAppFloatingButton from './WhatsAppFloatingButton.jsx'
import AiConciergeButton from './AiConciergeButton.jsx'
import AiConciergePanel from './AiConciergePanel.jsx'

// Mounted once in PublicLayout — a single intentional cluster (not two
// independent floating circles): AI trigger stacked above the WhatsApp
// button, bottom-end (left in RTL) so it clears the RTL mobile nav/CTA
// areas which live on the opposite edge.
export default function FloatingAssistanceCluster() {
  const [open, setOpen] = useState(false)
  const conversationId = useMemo(() => crypto.randomUUID(), [])

  return (
    <>
      <div className="fixed bottom-5 end-5 z-40 flex flex-col items-center gap-3 md:bottom-6 md:end-6">
        <AiConciergeButton open={open} onToggle={() => setOpen(v => !v)} />
        <WhatsAppFloatingButton />
      </div>

      <AnimatePresence>
        {open && <AiConciergePanel onClose={() => setOpen(false)} conversationId={conversationId} />}
      </AnimatePresence>
    </>
  )
}
