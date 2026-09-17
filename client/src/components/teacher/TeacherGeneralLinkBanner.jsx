import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Video, MonitorPlay, Briefcase, Globe, Copy, Check,
  ExternalLink, RefreshCw, ShieldCheck,
} from 'lucide-react'
import api from '../../utils/api.js'
import BulkSyncLinksModal from './BulkSyncLinksModal.jsx'
import { MEETING_PROVIDERS } from '../../config/constants.js'

function getProviderMeta(providerKey) {
  if (providerKey === 'meet') {
    return {
      label: 'Google Meet',
      color: '#00897B',
      bgColor: 'rgba(0,137,123,0.1)',
      borderColor: 'rgba(0,137,123,0.25)',
      Icon: MonitorPlay,
    }
  }
  if (providerKey === 'zoom') {
    return {
      label: 'Zoom',
      color: '#2D8CFF',
      bgColor: 'rgba(45,140,255,0.1)',
      borderColor: 'rgba(45,140,255,0.25)',
      Icon: Video,
    }
  }
  if (providerKey === 'teams') {
    return {
      label: 'Microsoft Teams',
      color: '#6264A7',
      bgColor: 'rgba(98,100,167,0.1)',
      borderColor: 'rgba(98,100,167,0.25)',
      Icon: Briefcase,
    }
  }
  return {
    label: 'رابط مخصص',
    color: '#7c3aed',
    bgColor: 'rgba(124,58,237,0.1)',
    borderColor: 'rgba(124,58,237,0.25)',
    Icon: Globe,
  }
}

export default function TeacherGeneralLinkBanner() {
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['teacher', 'links'],
    queryFn: () => api.get('/teachers/me/links').then((r) => r.data?.data || []),
  })

  // Primary active link is the first saved link
  const primaryLink = links?.[0] || null

  function handleCopy() {
    if (!primaryLink?.link) return
    navigator.clipboard.writeText(primaryLink.link)
    setCopied(true)
    toast.success('تم نسخ الرابط العام بنجاح!')
    setTimeout(() => setCopied(false), 2500)
  }

  function handleTest() {
    if (!primaryLink?.link) return
    window.open(primaryLink.link, '_blank', 'noopener,noreferrer')
  }

  const meta = primaryLink ? getProviderMeta(primaryLink.provider) : null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 relative overflow-hidden bg-white border border-gray-100 shadow-xs"
        dir="rtl"
      >
        {/* Subtle background glow */}
        <div
          className="absolute -top-12 end-0 w-64 h-64 rounded-full opacity-[0.04] pointer-events-none"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }}
        />

        {primaryLink ? (
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Left/Start side: Icon and Link Info */}
            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-none shadow-xs"
                style={{ background: meta.bgColor, border: `1px solid ${meta.borderColor}` }}
              >
                <meta.Icon size={24} color={meta.color} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-heading font-extrabold text-sm sm:text-base text-gray-900">
                    رابط المحاضرات العام (المعتمد لجميع الطلاب)
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {meta.label} نشط
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="bg-gray-50 border border-gray-200/80 rounded-xl px-3 py-1 font-mono text-xs text-gray-700 truncate max-w-xs sm:max-w-md select-all">
                    {primaryLink.link}
                  </div>
                  <span className="text-[11px] text-gray-400 hidden sm:inline">
                    (يُعمم تلقائياً على كل حصصك وجداولك)
                  </span>
                </div>
              </div>
            </div>

            {/* Right/End side: Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap flex-none justify-end">
              <button
                type="button"
                onClick={handleCopy}
                className="h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5"
                title="نسخ الرابط للحافظة"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-gray-500" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>

              <button
                type="button"
                onClick={handleTest}
                className="h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-all flex items-center gap-1.5"
                title="فتح الرابط للتأكد من عمله"
              >
                <ExternalLink size={14} className="text-gray-500" />
                <span>اختبار الرابط</span>
              </button>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-violet-200"
              >
                <RefreshCw size={14} />
                <span>تغيير وتعميم الرابط</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty / Unset State */
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-none text-amber-600">
                <Video size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-heading font-extrabold text-sm sm:text-base text-gray-900">
                    رابط المحاضرات العام غير معيّن بعد
                  </h3>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    مطلوب تعيينه
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  قم بتعيين رابط Zoom أو Google Meet دائم ليتم اعتماده وتعميمه على طلابك وحصصك تلقائياً.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-violet-200 flex-none"
            >
              <RefreshCw size={14} />
              <span>تعيين الرابط العام الآن</span>
            </button>
          </div>
        )}
      </motion.div>

      {showModal && (
        <BulkSyncLinksModal
          open={showModal}
          onClose={() => setShowModal(false)}
          initialLink={primaryLink?.link || ''}
          savedLinks={links}
        />
      )}
    </>
  )
}
