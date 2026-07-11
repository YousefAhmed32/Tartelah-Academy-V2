import { Clock, MessageCircle, Globe2, ArrowLeft, AlertTriangle } from 'lucide-react'

// Defensive: older/unsaved records may still hold a full <iframe> tag
// (Google's "Embed a map" copy-paste output) instead of a bare src URL.
function extractEmbedSrc(value) {
  if (!value) return value
  const match = value.match(/src=["']([^"']+)["']/i)
  return match ? match[1] : value
}

export default function SupportPanel({ workingHours, emergencyContact, whatsappHref, mapEmbedUrl }) {
  mapEmbedUrl = extractEmbedSrc(mapEmbedUrl)
  return (
    <aside className="flex flex-col gap-5">

      {/* Working hours + emergency contact */}
      <div className="card-light p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-[#FBF3DF]">
            <Clock size={20} strokeWidth={1.8} className="text-brand-goldDark" />
          </span>
          <h3 className="font-heading text-[16px] font-extrabold text-brand-textBody2">ساعات العمل</h3>
        </div>
        <p className="mt-4 rounded-2xl bg-[#FCFBFE] px-4 py-3 text-[14.5px] leading-[1.8] text-brand-textBody">
          {workingHours}
        </p>

        {emergencyContact && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[#f6e3b8] bg-[#FBF3DF] px-4 py-3">
            <AlertTriangle size={16} strokeWidth={1.8} className="mt-0.5 flex-none text-brand-goldDark" />
            <div>
              <div className="text-[11.5px] font-bold text-brand-goldDark">تواصل طارئ</div>
              <div dir="ltr" className="break-all text-start text-[13.5px] text-brand-textBody">{emergencyContact}</div>
            </div>
          </div>
        )}
      </div>

      {/* Instant WhatsApp shortcut */}
      <div className="card-light p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-[#EAF9EF]">
            <MessageCircle size={20} strokeWidth={1.8} className="text-[#1F9D57]" />
          </span>
          <h3 className="font-heading text-[16px] font-extrabold text-brand-textBody2">تحتاج رداً أسرع؟</h3>
        </div>
        <p className="mt-3 text-[14px] leading-[1.8] text-gray-500">
          تواصل معنا مباشرة عبر واتساب واحصل على مساعدة فورية من فريق الدعم.
        </p>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-btn bg-[#25D366] px-5 py-3 font-body font-bold text-white transition-transform duration-200 hover:-translate-y-0.5"
        >
          فتح واتساب
          <ArrowLeft size={16} strokeWidth={2.2} />
        </a>
      </div>

      {/* Map or online-academy fallback */}
      {mapEmbedUrl ? (
        <div className="card-light overflow-hidden !p-0">
          <iframe
            src={mapEmbedUrl}
            width="100%"
            height="220"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            title="موقع الأكاديمية"
          />
        </div>
      ) : (
        <div className="card-light p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#F2ECFA]">
            <Globe2 size={26} strokeWidth={1.5} className="text-brand-purple" />
          </span>
          <div className="mt-3 font-heading text-[15px] font-bold text-brand-textBody2">أكاديمية عبر الإنترنت بالكامل</div>
          <div className="mt-1 text-[13.5px] text-gray-500">نخدم الطلاب من جميع أنحاء العالم أونلاين</div>
        </div>
      )}
    </aside>
  )
}
