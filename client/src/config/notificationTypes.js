import { Calendar, FileText, Star, CreditCard, UserRound, CalendarDays, Wallet, Clock3, Bell } from 'lucide-react'

// Single source of truth for Notification.type display (icon/color/label) —
// shared by the bell dropdown, the full notification center, and the
// dashboard "latest notifications" widget, so they never drift apart.
export const NOTIFICATION_TYPE_CONFIG = {
  session:      { label: 'حصة',    color: '#7c3aed', bg: 'rgba(124,58,237,0.13)', dot: '#7c3aed', Icon: Calendar },
  homework:     { label: 'واجب',   color: '#3b82f6', bg: 'rgba(59,130,246,0.13)', dot: '#3b82f6', Icon: FileText },
  evaluation:   { label: 'تقييم',  color: '#d97706', bg: 'rgba(217,119,6,0.13)',  dot: '#d97706', Icon: Star },
  subscription: { label: 'اشتراك', color: '#059669', bg: 'rgba(5,150,105,0.13)',  dot: '#059669', Icon: CreditCard },
  enrollment:   { label: 'تسجيل',  color: '#b45309', bg: 'rgba(180,83,9,0.13)',   dot: '#f59e0b', Icon: UserRound },
  schedule:     { label: 'جدول',   color: '#0891b2', bg: 'rgba(8,145,178,0.13)',  dot: '#0891b2', Icon: CalendarDays },
  payment:      { label: 'دفع',    color: '#059669', bg: 'rgba(5,150,105,0.13)',  dot: '#059669', Icon: Wallet },
  attendance:   { label: 'حضور',   color: '#f59e0b', bg: 'rgba(245,158,11,0.13)', dot: '#f59e0b', Icon: Clock3 },
  system:       { label: 'نظام',   color: '#7c6aaa', bg: 'rgba(124,106,170,0.1)', dot: '#9b7fd6', Icon: Bell },
}

export const NOTIFICATION_PRIORITY_CONFIG = {
  urgent: { label: 'عاجل',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)', rank: 0 },
  high:   { label: 'مهم',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', rank: 1 },
  medium: { label: 'عادي',  color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', rank: 2 },
  low:    { label: 'منخفض', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', rank: 3 },
}
