import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { Send, X, ThumbsUp, ThumbsDown, RotateCw, BookOpen, User, Package, MessageCircle } from 'lucide-react'
import api from '../../../utils/api.js'
import { useAiPageContext } from '../../../hooks/useAiPageContext.js'

const DEFAULT_SUGGESTIONS = ['رشّح لي دورة مناسبة', 'ما الدورات المتاحة؟', 'هل يوجد شهادة إتمام؟', 'أريد التحدث مع الدعم']
const COURSE_PAGE_SUGGESTIONS = ['هل هذه الدورة مناسبة للمبتدئين؟', 'ما مدة الدورة؟', 'كيف أسجل؟']
const MAX_HISTORY = 12

function entityIcon(type) {
  if (type === 'course') return <BookOpen size={14} strokeWidth={1.8} />
  if (type === 'teacher') return <User size={14} strokeWidth={1.8} />
  if (type === 'package') return <Package size={14} strokeWidth={1.8} />
  return null
}

function EntityCard({ entity }) {
  if (entity.type === 'contact') return null
  if (entity.type === 'knowledge') {
    return (
      <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'rgba(232,199,106,0.08)', border: '1px solid rgba(232,199,106,0.18)', color: '#E7E0F5' }}>
        {entity.name}
      </div>
    )
  }
  return (
    <Link
      to={entity.route}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
      style={{ background: 'rgba(124,58,237,0.1)', color: '#c9b8ef', border: '1px solid rgba(124,58,237,0.22)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.18)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.1)' }}
    >
      <span style={{ color: '#a78fd6' }}>{entityIcon(entity.type)}</span>
      <span className="line-clamp-1">{entity.name}</span>
      {entity.price != null && <span style={{ color: '#E8C76A' }}>· {entity.price} {entity.currency === 'EGP' ? 'جنيه' : entity.currency}</span>}
    </Link>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1" aria-label="المساعد يكتب">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: '#a78fd6' }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

export default function AiConciergePanel({ onClose, conversationId }) {
  const reduced = useReducedMotion()
  const pageContext = useAiPageContext()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [feedbackGiven, setFeedbackGiven] = useState({})
  const bottomRef = useRef(null)
  const panelRef = useRef(null)

  const { data: settings } = useQuery({
    queryKey: ['public', 'settings'],
    queryFn: () => api.get('/website/settings').then(r => r.data.data),
    staleTime: 600_000,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }, [messages, reduced])

  useEffect(() => {
    const onKeyDown = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // The desktop panel is a small anchored card, not a full-screen modal — it
  // must never block clicks/scroll on the rest of the page. Only the mobile
  // bottom sheet (which visually covers most of the viewport) behaves modally.
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    if (!isMobile) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prevOverflow }
  }, [])

  // Desktop "click outside to close" — scoped to the panel itself instead of
  // an invisible full-page catcher, so the rest of the page stays clickable.
  useEffect(() => {
    function onMouseDown(e) {
      if (window.innerWidth < 768) return
      if (panelRef.current?.contains(e.target)) return
      if (e.target.closest('[data-ai-cluster-trigger]')) return
      onClose()
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [onClose])

  const chatMutation = useMutation({
    mutationFn: (payload) => api.post('/ai/chat', payload).then(r => r.data.data),
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        entities: data.entities || [],
        suggestions: data.suggestions || [],
        handoff: data.handoff,
        timestamp: new Date().toISOString(),
      }])
    },
    onError: () => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'تعذر الوصول للمساعد الآن. يمكنك المحاولة مرة أخرى أو التواصل معنا عبر واتساب.',
        isError: true,
        timestamp: new Date().toISOString(),
      }])
    },
  })

  const feedbackMutation = useMutation({
    mutationFn: (payload) => api.post('/ai/feedback', payload),
  })

  function sendMessage(text) {
    const question = text.trim()
    if (!question) return
    const history = messages.slice(-MAX_HISTORY).map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: question, timestamp: new Date().toISOString() }])
    setInput('')
    chatMutation.mutate({ message: question, history, pageContext, conversationId })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function giveFeedback(messageId, value) {
    if (feedbackGiven[messageId]) return
    setFeedbackGiven(prev => ({ ...prev, [messageId]: value }))
    feedbackMutation.mutate({ conversationId, responseId: messageId, value, persona: 'concierge' })
  }

  function retryLast() {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    setMessages(prev => prev.filter(m => !m.isError))
    const history = messages.slice(-MAX_HISTORY).filter(m => m.id !== lastUser.id).map(m => ({ role: m.role, content: m.content }))
    chatMutation.mutate({ message: lastUser.content, history, pageContext, conversationId })
  }

  const isEmpty = messages.length === 0
  const whatsappHref = settings?.whatsapp
    ? `https://api.whatsapp.com/send/?phone=${settings.whatsapp}&text=${encodeURIComponent('السلام عليكم، كنت أتحدث مع المساعد الذكي وأحتاج مساعدة إضافية.')}`
    : null
  const lastMessage = messages[messages.length - 1]
  const showRetry = lastMessage?.isError

  const contextualSuggestions = pageContext.pageType === 'course' ? COURSE_PAGE_SUGGESTIONS : DEFAULT_SUGGESTIONS
  const activeSuggestions = lastMessage?.suggestions?.length ? lastMessage.suggestions : (isEmpty ? contextualSuggestions : null)

  return (
    <>
      {/* Dim backdrop — mobile bottom sheet only; desktop stays click-through
          (closing there is handled by the scoped mousedown listener above) */}
      <div className="fixed inset-0 z-[64] bg-[rgba(6,2,20,0.55)] md:hidden" onClick={onClose} />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="مساعد ترتيلة الذكي"
        dir="rtl"
        initial={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.97 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        onClick={e => e.stopPropagation()}
        className="fixed inset-x-0 bottom-0 z-[65] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl md:inset-x-auto md:bottom-24 md:right-6 md:w-[400px] md:max-h-[600px] md:rounded-3xl"
        style={{
          background: '#150232',
          border: '1px solid rgba(150,120,220,0.22)',
          boxShadow: '0 -10px 50px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 flex-none" style={{ borderBottom: '1px solid rgba(150,120,220,0.15)' }}>
          <div>
            <h2 className="font-heading font-bold text-white text-base">مساعد ترتيلة الذكي</h2>
            <p className="text-xs" style={{ color: '#8b7aad' }}>يساعدك في اختيار الدورة والإجابة عن أسئلتك</p>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق المساعد"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2"
            style={{ color: '#8b7aad', '--tw-ring-color': '#E8C76A' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scroll px-4 py-4 space-y-4">
          {isEmpty && (
            <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.04)', color: '#E7E0F5' }}>
              السلام عليكم 👋<br />
              أنا مساعد ترتيلة الذكي. أقدر أساعدك في اختيار الدورة المناسبة، معرفة تفاصيل البرامج، أو الوصول للمعلومة بسرعة.
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className="max-w-[85%] flex flex-col gap-1.5">
                <div
                  className="rounded-2xl px-4 py-2.5 text-sm"
                  style={{
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #7c3aed, #5b21b6)'
                      : msg.isError ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)',
                    color: msg.role === 'user' ? '#fff' : msg.isError ? '#fca5a5' : '#E7E0F5',
                    border: msg.isError ? '1px solid rgba(239,68,68,0.25)' : 'none',
                  }}
                >
                  {msg.content}
                </div>

                {msg.entities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.entities.map((e, i) => <EntityCard key={i} entity={e} />)}
                  </div>
                )}

                {msg.handoff?.recommended && whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold w-fit transition-opacity hover:opacity-90"
                    style={{ background: '#25D366', color: '#fff' }}
                  >
                    <MessageCircle size={14} strokeWidth={2} />
                    تواصل مع فريق الدعم عبر واتساب
                  </a>
                )}

                {msg.role === 'assistant' && !msg.isError && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => giveFeedback(msg.id, 'helpful')}
                      aria-label="إجابة مفيدة"
                      disabled={!!feedbackGiven[msg.id]}
                      className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                      style={{ color: feedbackGiven[msg.id] === 'helpful' ? '#22c55e' : '#6b5f8a' }}
                    >
                      <ThumbsUp size={13} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => giveFeedback(msg.id, 'not_helpful')}
                      aria-label="إجابة غير مفيدة"
                      disabled={!!feedbackGiven[msg.id]}
                      className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
                      style={{ color: feedbackGiven[msg.id] === 'not_helpful' ? '#ef4444' : '#6b5f8a' }}
                    >
                      <ThumbsDown size={13} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex items-start">
              <div className="rounded-2xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <TypingDots />
              </div>
            </div>
          )}

          {showRetry && (
            <button
              onClick={retryLast}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold w-fit transition-colors"
              style={{ background: 'rgba(124,58,237,0.12)', color: '#c9b8ef' }}
            >
              <RotateCw size={13} strokeWidth={2} />
              إعادة المحاولة
            </button>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips */}
        {activeSuggestions?.length > 0 && !chatMutation.isPending && (
          <div className="flex-none px-4 pb-2 flex gap-2 flex-wrap">
            {activeSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-colors"
                style={{ border: '1px solid rgba(150,120,220,0.25)', color: '#b3a4d0' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex-none flex items-end gap-2 px-4 py-3" style={{ borderTop: '1px solid rgba(150,120,220,0.15)' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="اكتب سؤالك هنا..."
            disabled={chatMutation.isPending}
            className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#E7E0F5', maxHeight: '100px', overflowY: 'auto', '--tw-ring-color': '#7c3aed' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || chatMutation.isPending}
            aria-label="إرسال"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', '--tw-ring-color': '#E8C76A' }}
          >
            <Send size={17} strokeWidth={2} />
          </button>
        </div>
      </motion.div>
    </>
  )
}
