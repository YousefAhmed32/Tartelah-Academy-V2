import axios from 'axios'
import { getFileUrl } from '../config/constants.js'
import { useAuthStore } from '../store/authStore.js'

// Fetches a private media file (homework attachments, payment proofs) with
// the current auth token and triggers a normal browser download — needed
// because these aren't plain <a href> links: the media endpoint requires an
// Authorization header for private files, which an anchor tag never sends.
export async function downloadPrivateFile(fileId, filename = 'file') {
  const token = useAuthStore.getState().accessToken
  const res = await axios.get(getFileUrl(fileId), {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
