import { Home, Tag, Compass, BookOpen, GraduationCap, Info, Library, HelpCircle, MessageCircle } from 'lucide-react'
import { ROUTES } from '../../config/constants.js'

// Structured navigation IA — replaces the old flat 8-link row.
// 'link' entries render directly; 'group' entries render as a
// dropdown (desktop) / accordion (mobile drawer). matchPaths drives
// the "active" state for a group when any of its children (or a
// nested detail route under them, e.g. /courses/:slug) is current.
export const PUBLIC_NAV = [
  { type: 'link', key: 'home', label: 'الرئيسية', to: ROUTES.HOME, end: true, Icon: Home },
  {
    type: 'group',
    key: 'learning',
    label: 'استكشف التعلم',
    matchPaths: [ROUTES.PROGRAMS, ROUTES.COURSES, ROUTES.TEACHERS],
    items: [
      { label: 'مسارات التعلم', description: 'رحلات تعليمية مبنية على مستواك وهدفك', to: ROUTES.PROGRAMS, Icon: Compass },
      { label: 'الدورات', description: 'برامج تعليمية مركزة بمحتوى واضح', to: ROUTES.COURSES, Icon: BookOpen },
      { label: 'المعلمون', description: 'نخبة من المعلمين المجازين والمتخصصين', to: ROUTES.TEACHERS, Icon: GraduationCap },
    ],
    highlight: {
      label: 'غير متأكد من أين تبدأ؟',
      description: 'تواصل مع فريقنا لمساعدتك في اختيار المسار الأنسب',
      to: ROUTES.CONTACT,
    },
  },
  { type: 'link', key: 'pricing', label: 'الأسعار', to: ROUTES.PRICING, end: false, Icon: Tag },
  {
    type: 'group',
    key: 'platform',
    label: 'المنصة',
    matchPaths: [ROUTES.ABOUT, ROUTES.ARTICLES, ROUTES.FAQ, ROUTES.CONTACT],
    items: [
      { label: 'من نحن', description: 'قصتنا ورسالتنا التعليمية', to: ROUTES.ABOUT, Icon: Info },
      { label: 'المقالات', description: 'مقالات تربوية في القرآن والتجويد', to: ROUTES.ARTICLES, Icon: Library },
      { label: 'الأسئلة الشائعة', description: 'إجابات سريعة على أكثر الأسئلة تكراراً', to: ROUTES.FAQ, Icon: HelpCircle },
      { label: 'تواصل معنا', description: 'فريقنا جاهز للرد على استفساراتك', to: ROUTES.CONTACT, Icon: MessageCircle },
    ],
  },
]

export function isNavItemActive(pathname, item) {
  if (item.type === 'link') {
    if (item.end) return pathname === item.to
    return pathname === item.to || pathname.startsWith(`${item.to}/`)
  }
  return item.matchPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
