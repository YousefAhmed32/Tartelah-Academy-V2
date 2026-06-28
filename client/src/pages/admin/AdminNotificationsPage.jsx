import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Send, User, Users, Bell } from 'lucide-react'
import api from '../../utils/api.js'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import NotificationCenter from '../../components/notifications/NotificationCenter.jsx'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

// ── Broadcast Modal ───────────────────────────────────────────────────────────

function BroadcastModal({ onClose }) {
  const [form, setForm] = useState({ titleAr: '', bodyAr: '', type: 'system', target: 'all', role: 'student', priority: 'medium' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mut = useMutation({
    mutationFn: (data) => api.post('/admin/notifications/broadcast', data).then(r => r.data),
    onSuccess: (res) => {
      toast.success(`تم إرسال الإشعار لـ ${res.data?.sent || 0} مستخدم`)
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ أثناء الإرسال'),
  })

  return (
    <Modal open onClose={onClose} title="إرسال إشعار جماعي" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button variant="purple" onClick={() => mut.mutate(form)} loading={mut.isPending} disabled={!form.titleAr}>إرسال</Button>
      </>}>
      <div className="space-y-4 text-right" dir="rtl">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">العنوان *</label>
          <input className={inputCls} value={form.titleAr} onChange={e => set('titleAr', e.target.value)} placeholder="عنوان الإشعار..." />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">الرسالة</label>
          <textarea className={`${inputCls} h-20 resize-none py-2.5`} value={form.bodyAr} onChange={e => set('bodyAr', e.target.value)} placeholder="محتوى الإشعار..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">المستهدفون</label>
            <select className={inputCls} value={form.target} onChange={e => set('target', e.target.value)}>
              <option value="all">جميع المستخدمين</option>
              <option value="role">حسب الدور</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">الأولوية</label>
            <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
              <option value="low">منخفض</option>
              <option value="medium">عادي</option>
              <option value="high">مهم</option>
              <option value="urgent">عاجل</option>
            </select>
          </div>
        </div>
        {form.target === 'role' && (
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">الدور</label>
            <select className={inputCls} value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="student">الطلاب فقط</option>
              <option value="teacher">المعلمون فقط</option>
              <option value="admin">المسؤولون فقط</option>
            </select>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Individual Notification Modal ─────────────────────────────────────────────

function IndividualModal({ onClose }) {
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [form, setForm] = useState({ titleAr: '', bodyAr: '', type: 'system', priority: 'medium' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['user-search', search],
    queryFn: () => api.get(`/admin/students?search=${encodeURIComponent(search)}&limit=8`).then(r => {
      const students = (r.data?.data || []).map(u => ({ ...u, role: 'student' }))
      return students
    }),
    enabled: search.length >= 2,
  })

  const { data: teacherResults } = useQuery({
    queryKey: ['teacher-search', search],
    queryFn: () => api.get(`/admin/teachers?search=${encodeURIComponent(search)}&limit=4`).then(r => {
      const teachers = (r.data?.data || []).map(u => ({ ...u, role: 'teacher' }))
      return teachers
    }),
    enabled: search.length >= 2,
  })

  const allResults = [...(searchResults || []), ...(teacherResults || [])]

  const mut = useMutation({
    mutationFn: (data) => api.post('/admin/notifications/individual', data).then(r => r.data),
    onSuccess: () => {
      toast.success('تم إرسال الإشعار')
      onClose()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'حدث خطأ'),
  })

  const handleSend = () => {
    if (!selectedUser || !form.titleAr) return toast.error('اختر مستخدماً وأدخل العنوان')
    mut.mutate({ userId: selectedUser._id, ...form })
  }

  return (
    <Modal open onClose={onClose} title="إرسال إشعار لمستخدم محدد" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button variant="purple" onClick={handleSend} loading={mut.isPending} disabled={!selectedUser || !form.titleAr}>إرسال</Button>
      </>}>
      <div className="space-y-4 text-right" dir="rtl">
        {/* User Search */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">البحث عن مستخدم *</label>
          {selectedUser ? (
            <div className="flex items-center justify-between p-3 bg-violet-50 rounded-xl border border-violet-200">
              <div>
                <div className="font-semibold text-gray-900 text-sm">{selectedUser.firstNameAr} {selectedUser.lastNameAr}</div>
                <div className="text-xs text-gray-500">{selectedUser.role === 'teacher' ? 'معلم' : 'طالب'} · {selectedUser.email}</div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-xs text-red-500 hover:text-red-700 font-semibold">تغيير</button>
            </div>
          ) : (
            <div className="relative">
              <input className={inputCls} value={search} onChange={e => setSearch(e.target.value)} placeholder="اكتب الاسم أو البريد الإلكتروني..." />
              {search.length >= 2 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {searching ? (
                    <div className="flex justify-center py-4"><Spinner color="border-violet-600" /></div>
                  ) : allResults.length > 0 ? (
                    allResults.map(u => (
                      <button key={u._id} onClick={() => { setSelectedUser(u); setSearch('') }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-right transition-colors">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                          {u.firstNameAr?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{u.firstNameAr} {u.lastNameAr}</div>
                          <div className="text-xs text-gray-400">{u.role === 'teacher' ? 'معلم' : 'طالب'} · {u.email}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-400">لا توجد نتائج</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">العنوان *</label>
          <input className={inputCls} value={form.titleAr} onChange={e => set('titleAr', e.target.value)} placeholder="عنوان الإشعار..." />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">الرسالة</label>
          <textarea className={`${inputCls} h-20 resize-none py-2.5`} value={form.bodyAr} onChange={e => set('bodyAr', e.target.value)} placeholder="محتوى الإشعار..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">النوع</label>
            <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="system">نظام</option>
              <option value="session">حصة</option>
              <option value="homework">واجب</option>
              <option value="evaluation">تقييم</option>
              <option value="payment">دفع</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">الأولوية</label>
            <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
              <option value="low">منخفض</option>
              <option value="medium">عادي</option>
              <option value="high">مهم</option>
              <option value="urgent">عاجل</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminNotificationsPage() {
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [showIndividual, setShowIndividual] = useState(false)

  return (
    <div dir="rtl">
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 mb-5">
        <button onClick={() => setShowIndividual(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors border border-violet-200">
          <User size={15} /> إشعار فردي
        </button>
        <button onClick={() => setShowBroadcast(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: '#7c3aed', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
          <Users size={15} /> إرسال جماعي
        </button>
      </div>

      <NotificationCenter theme="light" />

      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
      {showIndividual && <IndividualModal onClose={() => setShowIndividual(false)} />}
    </div>
  )
}
