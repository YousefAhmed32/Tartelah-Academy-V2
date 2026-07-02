import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Cropper from 'react-easy-crop'
import Spinner from './Spinner.jsx'

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.82

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

async function getCroppedBlob(imageSrc, cropPixels) {
  const image = await createImage(imageSrc)

  let { width, height } = cropPixels
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  ctx.drawImage(
    image,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, width, height,
  )

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', JPEG_QUALITY)
  })
}

/**
 * Reusable premium image-crop modal — wraps react-easy-crop with the project's
 * dark/purple/gold admin aesthetic. Used anywhere an uploaded image needs a
 * fixed-aspect crop before being sent to the server (Success Stories cards/banner,
 * and future upload flows).
 */
export default function ImageCropModal({ open, image, aspect = 1, onCancel, onCropped }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleApply() {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const blob = await getCroppedBlob(image, croppedAreaPixels)
      onCropped(blob)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={!processing ? onCancel : undefined}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg rounded-2xl overflow-hidden z-10"
            style={{
              background: 'linear-gradient(160deg,#1d0a3f,#140530)',
              border: '1px solid rgba(232,199,106,0.18)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="font-bold text-[15px]" style={{ color: '#fff', fontFamily: 'Cairo' }}>
                اقتصاص الصورة
              </h3>
              <button
                onClick={onCancel}
                disabled={processing}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Crop area */}
            <div className="relative w-full" style={{ height: 340, background: '#0d0420' }}>
              {image && (
                <Cropper
                  image={image}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid
                  style={{
                    containerStyle: { background: '#0d0420' },
                    cropAreaStyle: { border: '2px solid #E8C76A' },
                  }}
                />
              )}
            </div>

            {/* Zoom control */}
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                type="range"
                min={1} max={3} step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: '#E8C76A' }}
              />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M8 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={processing}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleApply}
                disabled={processing || !croppedAreaPixels}
                className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#E8C76A,#D4AF37)', color: '#2a1500' }}
              >
                {processing && <Spinner size="sm" />}
                تطبيق الاقتصاص
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
