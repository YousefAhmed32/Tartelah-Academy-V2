import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../utils/api.js'
import ContactHero from '../../components/contact/ContactHero.jsx'
import ContactMethods from '../../components/contact/ContactMethods.jsx'
import ContactForm from '../../components/contact/ContactForm.jsx'
import SupportPanel from '../../components/contact/SupportPanel.jsx'
import ContactFAQ from '../../components/contact/ContactFAQ.jsx'
import FinalContactCTA from '../../components/contact/FinalContactCTA.jsx'

export default function ContactPage() {
  const { data: settings = {} } = useQuery({
    queryKey: ['public', 'settings'],
    queryFn: () => api.get('/website/settings').then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
    placeholderData: {},
  })

  const { data: faqs = [] } = useQuery({
    queryKey: ['public', 'faqs'],
    queryFn: () => api.get('/website/faqs').then((r) => r.data.data || []),
    staleTime: 10 * 60 * 1000,
    placeholderData: [],
  })

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/website/contact', data),
  })

  async function handleSubmit(data) {
    try {
      await submitMutation.mutateAsync(data)
      return true
    } catch {
      return false
    }
  }

  const s = settings || {}
  const phone = s.phone || '+20 105 040 0096'
  const whatsapp = s.whatsapp || '966567443805'
  const emailAddr = s.email || 'tartela.online@gmail.com'
  const youtube = s.youtube || '@tartela.2online'
  const workingHours = s.workingHours || 'السبت – الخميس: 9:00 ص – 9:00 م'
  const supportText = s.supportText || 'نحن هنا لمساعدتك في أي وقت'
  const whatsappHref = `https://api.whatsapp.com/send/?phone=${whatsapp}`
  const youtubeHref = `https://youtube.com/${youtube.startsWith('@') ? youtube : `@${youtube}`}`

  const serverError = submitMutation.isError
    ? (submitMutation.error?.response?.data?.message || 'حدث خطأ أثناء الإرسال، يرجى المحاولة مجدداً')
    : null

  return (
    <div dir="rtl" className="bg-white">
      <ContactHero whatsappHref={whatsappHref} supportText={supportText} />

      <ContactMethods
        phone={phone}
        whatsappHref={whatsappHref}
        emailAddr={emailAddr}
        youtubeHref={youtubeHref}
        youtubeHandle={youtube}
        workingHours={workingHours}
      />

      {/* Main contact workspace — form + support context */}
      <section className="bg-white px-[clamp(20px,5vw,68px)] py-[clamp(56px,7vw,88px)]">
        <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-start gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-10">
          <ContactForm
            isSubmitting={submitMutation.isPending}
            serverError={serverError}
            onSubmit={handleSubmit}
          />
          <SupportPanel
            workingHours={workingHours}
            emergencyContact={s.emergencyContact}
            whatsappHref={whatsappHref}
            mapEmbedUrl={s.googleMapsEmbed}
          />
        </div>
      </section>

      <ContactFAQ faqs={faqs} />

      <FinalContactCTA />
    </div>
  )
}
