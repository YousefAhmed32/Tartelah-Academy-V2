import { ROUTES } from '../../../config/constants.js'

// Flat, data-driven IA — every primary destination is a direct link, never a
// dropdown. `tier: 'core'` items stay visible as soon as the inline nav
// appears (lg+); `tier: 'extended'` items join in only once there's roomier
// width (xl+). The core set is deliberately the same six destinations the
// approved design reference (Reference for design/Quran Academy.dc.html)
// ships in its flat nav — About/Articles are newer pages layered on top.
export const PUBLIC_NAV = [
  { key: 'home', label: 'الرئيسية', to: ROUTES.HOME, end: true, tier: 'core' },
  { key: 'programs', label: 'مسارات التعلم', to: ROUTES.PROGRAMS, tier: 'core' },
  { key: 'courses', label: 'الدورات', to: ROUTES.COURSES, tier: 'core' },
  { key: 'teachers', label: 'المعلمون', to: ROUTES.TEACHERS, tier: 'core' },
  { key: 'pricing', label: 'الأسعار', to: ROUTES.PRICING, tier: 'core' },
  { key: 'about', label: 'من نحن', to: ROUTES.ABOUT, tier: 'extended' },
  { key: 'articles', label: 'المقالات', to: ROUTES.ARTICLES, tier: 'extended' },
  { key: 'contact', label: 'تواصل معنا', to: ROUTES.CONTACT, tier: 'core' },
]

// Support content — reachable from the footer and the mobile drawer's
// secondary section, kept out of the primary row so the header stays scannable.
export const SECONDARY_NAV = [
  { key: 'faq', label: 'الأسئلة الشائعة', to: ROUTES.FAQ },
]

export function isNavItemActive(pathname, item) {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}
