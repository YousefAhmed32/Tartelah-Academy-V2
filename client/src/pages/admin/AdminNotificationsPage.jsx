import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { formatDateAr } from '../../utils/date.js'

export default function AdminNotificationsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ titleAr: '', bodyAr: '', type: 'system', target: 'all', role: '' })
  const qc = useQueryClient()

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => api.get('/admin/notifications').then(r => r.data.data),
  })

  const sendMutation = useMutation({
    mutationFn: (data) => api.post('/admin/notifications/broadcast', data),
    onSuccess: () => {
      toast.success('تم إرسال الإشعار بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] })
      setShowCreate(false)
      setForm({ titleAr: '', bodyAr: '', type: 'system', target: 'all', role: '' })
    },
    onError: () => toast.error('حدث خطأ أثناء الإرسال'),
  })

  return (
    <div dir="rtl">
      <PageHeader
        title="الإشعارات"
        subtitle="إدارة وإرسال الإشعارات"
        actions={<Button variant="purple" onClick={() => setShowCreate(true)}>📢 إرسال إشعار</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !logs.length ? (
        <div className="card-light p-12 text-center">
          <div className="text-4xl mb-3">📢</div>
          <p className="text-[#9b7fd6]">لا توجد سجلات إشعارات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((n) => (
            <div key={n._id} className="card-light p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#f0ecf8] flex items-center justify-center text-xl flex-none">📢</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-brand-textBody">{n.titleAr}</div>
                {n.bodyAr && <p className="text-sm text-[#9b7fd6] mt-0.5">{n.bodyAr}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-[#9b7fd6]">
                  <span>{formatDateAr(n.createdAt)}</span>
                  <Badge variant="gray">{n.target === 'all' ? 'الجميع' : n.role === 'student' ? 'الطلاب' : 'المعلمون'}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إرسال إشعار جماعي" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button variant="purple" onClick={() => sendMutation.mutate(form)} loading={sendMutation.isPending} disabled={!form.titleAr}>إرسال</Button>
        </>}
      >
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-brand-textBody mb-1">العنوان</label><input value={form.titleAr} onChange={e => setForm(p => ({ ...p, titleAr: e.target.value }))} className="field-light w-full" /></div>
          <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الرسالة</label><textarea value={form.bodyAr} onChange={e => setForm(p => ({ ...p, bodyAr: e.target.value }))} rows={3} className="field-light resize-none w-full" /></div>
          <div>
            <label className="block text-xs font-semibold text-brand-textBody mb-1">المستهدفون</label>
            <select value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} className="field-light w-full">
              <option value="all">الجميع</option>
              <option value="role">حسب الدور</option>
            </select>
          </div>
          {form.target === 'role' && (
            <div>
              <label className="block text-xs font-semibold text-brand-textBody mb-1">الدور</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="field-light w-full">
                <option value="student">الطلاب</option>
                <option value="teacher">المعلمون</option>
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
