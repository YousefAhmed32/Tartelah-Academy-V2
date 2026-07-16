import { useEffect, useState } from 'react'
import axios from 'axios'
import { getFileUrl } from '../../config/constants.js'
import { useAuthStore } from '../../store/authStore.js'
import Spinner from './Spinner.jsx'

// For private media (payment proofs, homework attachments) the unified
// /api/v1/media/:id endpoint requires a real Authorization header — a plain
// <img src> request never sends one, so it would just 401. This fetches the
// bytes via an authenticated request instead and renders them as a local
// object URL, exactly like <img> everywhere else visually.
export default function PrivateImage({ src, alt = '', className = '' }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    let objectUrl = null
    setError(false)
    setBlobUrl(null)
    if (!src) return

    const token = useAuthStore.getState().accessToken
    axios.get(getFileUrl(src), {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((res) => {
      if (!active) return
      objectUrl = URL.createObjectURL(res.data)
      setBlobUrl(objectUrl)
    }).catch(() => { if (active) setError(true) })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (!src) return null
  if (error) {
    return <div className={`flex items-center justify-center text-xs text-gray-400 ${className}`}>تعذّر تحميل الصورة</div>
  }
  if (!blobUrl) {
    return <div className={`flex items-center justify-center ${className}`}><Spinner size="sm" /></div>
  }
  return <img src={blobUrl} alt={alt} className={className} />
}
