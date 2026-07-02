import { useState, useRef, useEffect } from 'react'
import { getFileUrl } from '../../config/constants.js'
import ImageCropModal from './ImageCropModal.jsx'
import Spinner from './Spinner.jsx'

/**
 * Reusable image upload field: drag & drop, click-to-browse, crop (fixed aspect
 * ratio via ImageCropModal), preview, replace, remove. The caller owns the actual
 * network request — pass an async `onUpload(file)` that performs the upload and
 * updates its own state with the returned URL.
 */
export default function ImageUploadField({
  label,
  currentUrl,
  aspect = 1,
  recommendedSizeText,
  onUpload,
  onRemove,
  height = 180,
  dark = false,
}) {
  const [rawSrc, setRawSrc] = useState(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => () => { if (rawSrc) URL.revokeObjectURL(rawSrc) }, [rawSrc])

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setRawSrc(url)
    setCropOpen(true)
  }

  function closeCrop() {
    setCropOpen(false)
    if (rawSrc) URL.revokeObjectURL(rawSrc)
    setRawSrc(null)
  }

  async function handleCropped(blob) {
    const file = new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' })
    setCropOpen(false)
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
      if (rawSrc) URL.revokeObjectURL(rawSrc)
      setRawSrc(null)
    }
  }

  const previewUrl = getFileUrl(currentUrl)

  const theme = dark
    ? {
      labelColor: '#b3a4d0',
      bg: 'rgba(124,58,237,0.06)',
      border: '1px dashed rgba(150,120,220,0.25)',
      borderActive: '1.5px dashed #E8C76A',
      iconColor: '#8b7aad',
      hintColor: '#8b7aad',
      subHintColor: '#6b5f8a',
      spinnerColor: 'border-purple-400',
    }
    : {
      labelColor: '#374151',
      bg: '#F9FAFB',
      border: '1px dashed #E5E7EB',
      borderActive: '1.5px dashed #7c3aed',
      iconColor: '#9CA3AF',
      hintColor: '#6B7280',
      subHintColor: '#9CA3AF',
      spinnerColor: 'border-violet-600',
    }

  return (
    <div>
      {label && <div className="text-xs font-semibold mb-2" style={{ color: theme.labelColor }}>{label}</div>}

      <div
        className="relative rounded-xl overflow-hidden cursor-pointer flex items-center justify-center group"
        style={{
          height,
          background: theme.bg,
          border: dragOver ? theme.borderActive : theme.border,
          transition: 'border-color 0.2s',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
      >
        {uploading ? (
          <Spinner size="sm" color={theme.spinnerColor} />
        ) : previewUrl ? (
          <>
            <img src={previewUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.55)' }}
            >
              <span className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.12)' }}>
                استبدال
              </span>
              {onRemove && (
                <button
                  onClick={e => { e.stopPropagation(); onRemove() }}
                  className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.75)' }}
                >
                  حذف
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 pointer-events-none px-4 text-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke={theme.iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="text-xs" style={{ color: theme.hintColor }}>اسحب الصورة أو اضغط للرفع</span>
            {recommendedSizeText && (
              <span className="text-[10px]" style={{ color: theme.subHintColor }}>{recommendedSizeText}</span>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }}
        />
      </div>

      {previewUrl && recommendedSizeText && (
        <div className="text-[10px] mt-1.5" style={{ color: theme.subHintColor }}>{recommendedSizeText}</div>
      )}

      <ImageCropModal
        open={cropOpen}
        image={rawSrc}
        aspect={aspect}
        onCancel={closeCrop}
        onCropped={handleCropped}
      />
    </div>
  )
}
