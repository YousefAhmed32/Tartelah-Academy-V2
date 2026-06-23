import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../../utils/api.js'
import { useAuthStore } from '../../store/authStore.js'
import Avatar from '../../components/ui/Avatar.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { timeFromNow } from '../../utils/date.js'

const SUGGESTION_PROMPTS = [
  'ما هي أحكام التجويد الأساسية؟',
  'كيف أحسّن حفظي للقرآن الكريم؟',
  'ما الفرق بين الإدغام والإخفاء؟',
  'اشرح لي أحكام النون الساكنة والتنوين',
  'كيف أبدأ رحلة حفظ القرآن؟',
]

export default function AIAssistantPage() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'أهلاً! أنا مساعد ترتيلة الذكي. يمكنني مساعدتك في تعلم أحكام التجويد، وتحسين الحفظ، والإجابة على أسئلتك القرآنية. كيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date().toISOString(),
    }
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const askMutation = useMutation({
    mutationFn: (question) => api.post('/ai/ask', { question }).then(r => r.data.data),
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        sources: data.sources,
      }])
    },
    onError: () => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'عذراً، حدث خطأ أثناء معالجة سؤالك. يرجى المحاولة مرة أخرى.',
        timestamp: new Date().toISOString(),
        isError: true,
      }])
    },
  })

  function sendMessage(text = input) {
    const question = text.trim()
    if (!question) return
    setMessages(prev => [...prev, { role: 'user', content: question, timestamp: new Date().toISOString() }])
    setInput('')
    askMutation.mutate(question)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isWaiting = askMutation.isPending

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#f0ecf8]">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-gradient">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Z" stroke="white" strokeWidth="1.5"/><path d="M12 6v6l4 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <div>
          <h1 className="font-heading font-bold text-brand-textBody text-lg">المساعد الذكي</h1>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-600 font-semibold">متاح الآن</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scroll space-y-4 px-1 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-up`}>
            {msg.role === 'assistant' ? (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none bg-purple-gradient text-white font-bold text-sm">م</div>
            ) : (
              <Avatar src={user?.avatar} name={`${user?.firstNameAr || 'أ'}`} size="sm" />
            )}
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div
                className={`p-4 rounded-[18px] text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-purple-gradient text-white'
                    : msg.isError
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : 'bg-[#f8f5ff] text-brand-textBody'
                }`}
              >
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                {msg.sources?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#e8e0f5]">
                    <p className="text-xs font-semibold text-[#9b7fd6] mb-1">المصادر:</p>
                    {msg.sources.map((s, j) => (
                      <p key={j} className="text-xs text-[#9b7fd6]">• {s}</p>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs text-[#9b7fd6]/60">{timeFromNow(msg.timestamp)}</span>
            </div>
          </div>
        ))}
        {isWaiting && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none bg-purple-gradient text-white font-bold text-sm">م</div>
            <div className="bg-[#f8f5ff] p-4 rounded-[18px] flex items-center gap-2">
              <Spinner size="sm" color="border-brand-purple" />
              <span className="text-sm text-[#9b7fd6]">يفكر...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion Prompts */}
      {messages.length <= 2 && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {SUGGESTION_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => sendMessage(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-[#e0d8f5] text-brand-purple hover:bg-[#f0ecf8] transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-3 pt-3 border-t border-[#f0ecf8]">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          className="field-light flex-1 resize-none"
          placeholder="اكتب سؤالك هنا... (Enter للإرسال)"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
          disabled={isWaiting}
        />
        <Button
          variant="purple"
          size="sm"
          onClick={() => sendMessage()}
          disabled={!input.trim() || isWaiting}
          loading={isWaiting}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
        >
          إرسال
        </Button>
      </div>
    </div>
  )
}
