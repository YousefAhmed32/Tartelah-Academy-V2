import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Mail, Phone, MessageCircle, Play, CircleCheck } from 'lucide-react'
import api from '../../utils/api.js'
import { ROUTES } from '../../config/constants.js'

const QUICK_LINKS = [
  { label: 'الرئيسية', to: ROUTES.HOME },
  { label: 'مسارات التعلم', to: ROUTES.PROGRAMS },
  { label: 'المعلمون', to: ROUTES.TEACHERS },
  { label: 'الأسعار', to: ROUTES.PRICING },
  { label: 'المقالات', to: ROUTES.ARTICLES },
  { label: 'الأسئلة الشائعة', to: ROUTES.FAQ },
  { label: 'تواصل معنا', to: ROUTES.CONTACT },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const { data: settings = {} } = useQuery({
    queryKey: ['public', 'settings'],
    queryFn: () => api.get('/website/settings').then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
    placeholderData: {},
  })

  const s = settings || {}
  const phone     = s.phone     || '+20 105 040 0096'
  const whatsapp  = s.whatsapp  || '966567443805'
  const emailAddr = s.email     || 'tartela.online@gmail.com'
  const youtube   = s.youtube   || '@tartela.2online'
  const workingHours = s.workingHours || 'السبت – الخميس: 9:00 ص – 9:00 م'
  const footerDesc   = s.footerDescription || 'منصة ترتيلة أونلاين — وجهتك الأولى لتعلم القرآن الكريم بإتقان مع أفضل المعلمين'
  const copyright    = s.footerCopyright   || '© 2026 ترتيلة أونلاين — جميع الحقوق محفوظة'
  const privacyUrl   = s.privacyPolicyUrl  || '#'
  const termsUrl     = s.termsUrl          || '#'
  const newsletterEnabled = s.newsletterEnabled !== false

  const subscribeMutation = useMutation({
    mutationFn: (data) => api.post('/website/newsletter', data),
    onSuccess: () => { setSubscribed(true); setEmail('') },
  })

  function handleSubscribe(e) {
    e.preventDefault()
    if (!email || subscribeMutation.isPending) return
    subscribeMutation.mutate({ email })
  }

  return (
    <footer dir="rtl" style={{ background: '#0c0220', borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 'clamp(48px,5vw,72px)', paddingBottom: 0 }}>
        <div style={{ maxWidth: 1340, margin: '0 auto', padding: '0 clamp(20px,5vw,68px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '48px 36px', paddingBottom: 48 }}>

            {/* Col 1 — Logo + Description */}
            <div>
              <Link to={ROUTES.HOME} style={{ display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none', marginBottom: 18 }}>
                <img src="/images/logo.jpg" alt="ترتيلة" style={{ width: 50, height: 50, borderRadius: 13, objectFit: 'cover', border: '1px solid rgba(212,175,55,.4)', boxShadow: '0 6px 18px rgba(0,0,0,.4)' }} />
                <div style={{ lineHeight: 1.18 }}>
                  <div style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 18, color: '#F3E6C0' }}>ترتيلة</div>
                  <div style={{ fontSize: 10, letterSpacing: 3, fontWeight: 600, color: '#9b7fd6' }}>ONLINE</div>
                </div>
              </Link>
              <p style={{ color: '#a89ec8', fontSize: 14.5, lineHeight: 1.85, maxWidth: 260 }}>{footerDesc}</p>
              {/* Socials */}
              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                {s.facebook  && <SocialBtn href={s.facebook}  icon={<FbIcon />}  color="#1877F2" />}
                {s.instagram && <SocialBtn href={s.instagram} icon={<IgIcon />}  color="#E1306C" />}
                <SocialBtn href={`https://youtube.com/${youtube.startsWith('@') ? youtube : '@' + youtube}`} icon={<YtIcon />} color="#FF0000" />
                <SocialBtn href={`https://wa.me/${whatsapp}`} icon={<WaIcon />} color="#25D366" />
                {s.twitter   && <SocialBtn href={s.twitter}   icon={<TwIcon />}  color="#1DA1F2" />}
              </div>
            </div>

            {/* Col 2 — Quick Links */}
            <div>
              <h4 style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 15, color: '#F3E6C0', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.07)' }}>روابط سريعة</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {QUICK_LINKS.map(l => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      style={{ color: '#a89ec8', textDecoration: 'none', fontSize: 14.5, transition: 'color .2s', display: 'flex', alignItems: 'center', gap: 7 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#E8C76A' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#a89ec8' }}
                    >
                      <svg width="6" height="6" viewBox="0 0 6 6" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="3" cy="3" r="3" fill="#7c3aed"/>
                      </svg>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 — Contact Info */}
            <div>
              <h4 style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 15, color: '#F3E6C0', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.07)' }}>تواصل معنا</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <ContactItem Icon={Mail}           label={emailAddr} href={`mailto:${emailAddr}`} />
                <ContactItem Icon={Phone}          label={phone} href={`tel:${phone.replace(/\s/g,'')}`} />
                <ContactItem Icon={MessageCircle}  label="واتساب" href={`https://api.whatsapp.com/send/?phone=${whatsapp}`} />
                <ContactItem Icon={Play}           label={youtube} href={`https://youtube.com/${youtube.startsWith('@') ? youtube : '@'+youtube}`} />
                <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 10, background: 'rgba(124,58,237,.12)', border: '1px solid rgba(124,58,237,.2)' }}>
                  <div style={{ fontSize: 11, color: '#9b7fd6', marginBottom: 4, fontWeight: 600 }}>ساعات العمل</div>
                  <div style={{ fontSize: 13.5, color: '#c9bce8' }}>{workingHours}</div>
                </div>
              </div>
            </div>

            {/* Col 4 — Newsletter */}
            {newsletterEnabled && (
              <div>
                <h4 style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 15, color: '#F3E6C0', marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.07)' }}>النشرة البريدية</h4>
                <p style={{ color: '#a89ec8', fontSize: 14, lineHeight: 1.7, marginBottom: 18 }}>
                  {s.newsletterText || 'اشترك للحصول على أحدث المقالات والدروس والتحديثات'}
                </p>
                {subscribed ? (
                  <div style={{ padding: '12px 18px', borderRadius: 12, background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.3)', color: '#4ade80', fontSize: 14, fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CircleCheck size={16} strokeWidth={2} /> تم الاشتراك بنجاح!
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      type="email"
                      placeholder="بريدك الإلكتروني"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{
                        padding: '11px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,.12)',
                        background: 'rgba(255,255,255,.06)', color: '#e8e0f5', fontSize: 14,
                        outline: 'none', fontFamily: 'Tajawal', direction: 'rtl',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={subscribeMutation.isPending}
                      style={{
                        padding: '11px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #7C3AED, #5b21b6)',
                        color: '#fff', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 14,
                        boxShadow: '0 6px 20px rgba(124,58,237,.4)',
                        transition: 'transform .2s',
                        opacity: subscribeMutation.isPending ? 0.7 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = '' }}
                    >
                      {subscribeMutation.isPending ? 'جارِ الاشتراك...' : 'اشتراك'}
                    </button>
                    {subscribeMutation.isError && (
                      <div style={{ color: '#f87171', fontSize: 12.5 }}>
                        {subscribeMutation.error?.response?.data?.message || 'حدث خطأ، حاول مرة أخرى'}
                      </div>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ color: '#6b5f8a', fontSize: 13.5, margin: 0 }}>{copyright}</p>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'سياسة الخصوصية', href: privacyUrl },
                { label: 'شروط الاستخدام', href: termsUrl },
                { label: 'سياسة الكوكيز', href: s.cookiesPolicyUrl || '#' },
              ].map(l => (
                <a key={l.label} href={l.href} style={{ color: '#6b5f8a', fontSize: 13.5, textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#a89ec8' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#6b5f8a' }}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
  )
}


function ContactItem({ Icon, label, href }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a89ec8', textDecoration: 'none', fontSize: 14, transition: 'color .2s' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#E8C76A' }}
      onMouseLeave={e => { e.currentTarget.style.color = '#a89ec8' }}>
      <Icon size={15} strokeWidth={1.8} />
      <span>{label}</span>
    </a>
  )
}

function SocialBtn({ href, icon, color }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', transition: 'all .25s', color: '#a89ec8', textDecoration: 'none' }}
      onMouseEnter={e => { e.currentTarget.style.background = color + '22'; e.currentTarget.style.borderColor = color + '66' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)' }}>
      {icon}
    </a>
  )
}

const FbIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)
const IgIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
)
const YtIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20.05 12 20.05 12 20.05s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#0c0220"/>
  </svg>
)
const WaIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
)
const TwIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)
