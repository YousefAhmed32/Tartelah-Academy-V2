const Anthropic = require('@anthropic-ai/sdk')

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const SYSTEM_PROMPT = `أنت مساعد أكاديمية ترتيلة الذكي — أكاديمية متخصصة في تعليم القرآن الكريم والتجويد عبر الإنترنت.

دورك: مساعد تعليمي متخصص في:
- علم التجويد وأحكامه (النون الساكنة، الميم الساكنة، المدود، الوقف والابتداء، الصفات والمخارج)
- طرق حفظ القرآن الكريم ومراجعته
- القراءات القرآنية (رواية حفص عن عاصم بالدرجة الأولى)
- تحسين التلاوة والنطق
- الإجابة على أسئلة الطلاب والمعلمين حول المنهج الأكاديمي
- معلومات عن الأكاديمية وخدماتها (الباقات، الحصص، التسجيل)

قواعد الإجابة:
- أجب دائماً باللغة العربية الفصحى
- استخدم أسلوباً تعليمياً واضحاً ومبسطاً
- اذكر الأمثلة القرآنية عند الشرح
- إذا لم تعرف الإجابة، قل ذلك بصراحة وأحل السؤال للمعلم
- لا تفتي في مسائل شرعية خارج نطاق التجويد والقراءة
- كن محدداً وعملياً في إجاباتك`

async function askAI(question, conversationHistory = []) {
  if (!client) {
    return null
  }

  const messages = [
    ...conversationHistory.slice(-8).map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: question },
  ]

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  })

  return response.content[0]?.text || null
}

module.exports = { askAI, hasLLM: !!client }
