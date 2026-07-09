import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import api from '../../../utils/api.js'
import { useAiPageContext } from '../../../hooks/useAiPageContext.js'

function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.9 9.9 0 0 0 4.76 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.19 0 4.25.85 5.8 2.4a8.2 8.2 0 0 1 2.42 5.84c0 4.55-3.71 8.25-8.25 8.25a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.13.82.84-3.05-.19-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.55 3.71-8.24 8.26-8.24Zm-4.48 4.7c-.16 0-.42.06-.64.31s-.85.83-.85 2.02.87 2.35.99 2.51c.12.16 1.7 2.6 4.15 3.64 2.05.87 2.47.7 2.92.65.45-.04 1.44-.59 1.64-1.16.2-.57.2-1.05.14-1.16-.06-.1-.22-.16-.46-.28-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.64-1.2-1.42-1.34-1.66-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.35-.77-1.85-.2-.48-.4-.42-.55-.42h-.02Z"
        fill="currentColor"
      />
    </svg>
  )
}

const APP_MESSAGE_PREFIX = 'السلام عليكم، أحتاج مساعدة بخصوص'

export default function WhatsAppFloatingButton() {
  const pageContext = useAiPageContext()

  const { data: settings } = useQuery({
    queryKey: ['public', 'settings'],
    queryFn: () => api.get('/website/settings').then(r => r.data.data),
    staleTime: 600_000,
  })

  const { data: course } = useQuery({
    queryKey: ['public', 'course', pageContext.courseSlug],
    queryFn: () => api.get(`/courses/${pageContext.courseSlug}`).then(r => r.data.data),
    enabled: pageContext.pageType === 'course' && !!pageContext.courseSlug,
    staleTime: 300_000,
  })

  const { data: teacher } = useQuery({
    queryKey: ['public', 'teacher', pageContext.teacherId],
    queryFn: () => api.get(`/teachers/public/${pageContext.teacherId}`).then(r => r.data.data),
    enabled: pageContext.pageType === 'teacher' && !!pageContext.teacherId,
    staleTime: 300_000,
  })

  const whatsapp = settings?.whatsapp
  if (!whatsapp) return null

  let text = `${APP_MESSAGE_PREFIX} منصة ترتيلة أونلاين.`
  if (pageContext.pageType === 'course' && course?.nameAr) {
    text = `${APP_MESSAGE_PREFIX} دورة: ${course.nameAr}`
  } else if (pageContext.pageType === 'teacher' && teacher) {
    const name = `${teacher.firstNameAr || ''} ${teacher.lastNameAr || ''}`.trim()
    if (name) text = `${APP_MESSAGE_PREFIX} المعلم: ${name}`
  } else if (pageContext.pageType === 'pricing') {
    text = `${APP_MESSAGE_PREFIX} باقات الاشتراك في منصة ترتيلة أونلاين.`
  }

  const href = `https://api.whatsapp.com/send/?phone=${whatsapp}&text=${encodeURIComponent(text)}`

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      title="تواصل معنا عبر واتساب"
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22, delay: 0.15 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      className="group relative flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full text-white shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ background: '#25D366', '--tw-ring-color': '#25D366', '--tw-ring-offset-color': '#0f0226' }}
    >
      <WhatsAppIcon className="h-6 w-6 md:h-7 md:w-7" />
      <span
        className="pointer-events-none absolute end-full me-3 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ background: 'rgba(15,2,38,0.92)', color: '#E7E0F5', border: '1px solid rgba(150,120,220,0.2)' }}
      >
        تواصل معنا عبر واتساب
      </span>
    </motion.a>
  )
}
