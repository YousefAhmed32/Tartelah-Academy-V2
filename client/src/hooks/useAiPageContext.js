import { useLocation } from 'react-router-dom'

// Derives a small, safe page-context descriptor from the current URL only —
// used to (a) prefill the WhatsApp message and (b) hint the AI concierge at
// which course/teacher the visitor is looking at. The identifiers here are
// only ever used server-side as DB lookup KEYS (see aiTools.service.js) —
// never trusted as facts about names/prices.
export function useAiPageContext() {
  const location = useLocation()
  const pathname = location.pathname

  const courseMatch = pathname.match(/^\/courses\/([^/]+)$/)
  const teacherMatch = pathname.match(/^\/teachers\/([^/]+)$/)
  const articleMatch = pathname.match(/^\/articles\/([^/]+)$/)

  if (courseMatch) {
    return { pathname, pageType: 'course', courseSlug: courseMatch[1] }
  }
  if (teacherMatch) {
    return { pathname, pageType: 'teacher', teacherId: teacherMatch[1] }
  }
  if (articleMatch) {
    return { pathname, pageType: 'article', articleSlug: articleMatch[1] }
  }
  if (pathname === '/pricing') {
    return { pathname, pageType: 'pricing' }
  }
  if (pathname === '/') {
    return { pathname, pageType: 'home' }
  }
  return { pathname, pageType: 'other' }
}
