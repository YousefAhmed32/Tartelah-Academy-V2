import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { MEETING_PROVIDERS } from '../../config/constants.js'

export default function TeacherLinksPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ provider: 'zoom', label: '', link: '' })
  const qc = useQueryClient()

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['teacher', 'links'],
    queryFn: () => api.get('/teachers/me/links').then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/teachers/me/links', data),
    onSuccess: () => {
      toast.success('تم حفظ الرابط')
      qc.invalidateQueries({ queryKey: ['teacher', 'links'] })
      setShowModal(false)
      setForm({ provider: 'zoom', label: '', link: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/teachers/me/links/${id}`),
    onSuccess: () => {
      toast.success('تم حذف الرابط')
      qc.invalidateQueries({ queryKey: ['teacher', 'links'] })
    },
    onError: () => toast.error('حدث خطأ'),
  })

  const providers = Object.entries(MEETING_PROVIDERS).map(([k, v]) => ({ key: k, ...v }))

  return (
    <div>
      <PageHeader
        title="روابط الاجتماعات"
        subtitle="إدارة روابط الاجتماع الدائمة"
        actions={<Button variant="gold" onClick={() => setShowModal(true)}>+ إضافة رابط</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-gold" /></div>
      ) : !links.length ? (
        <div className="rounded-card p-12 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-5xl mb-4">🔗</div>
          <p className="text-white font-heading font-bold text-lg mb-2">لا توجد روابط محفوظة</p>
          <p style={{ color: '#b3a4d0' }} className="text-sm">أضف روابط الاجتماع الخاصة بك للاستخدام السريع</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((link) => {
            const provider = MEETING_PROVIDERS[link.provider]
            return (
              <div key={link._id} className="rounded-card p-5 flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-none" style={{ background: `${provider?.color || '#7c3aed'}20` }}>
                  {link.provider === 'zoom' ? '🎥' : link.provider === 'meet' ? '📹' : link.provider === 'teams' ? '💼' : '🔗'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold">{link.label || provider?.label}</div>
                  <a href={link.link} target="_blank" rel="noopener noreferrer" className="text-xs truncate block mt-0.5" style={{ color: '#b3a4d0' }}>{link.link}</a>
                </div>
                <div className="flex items-center gap-2">
                  <a href={link.link} target="_blank" rel="noopener noreferrer" className="btn-gold text-xs py-1.5 px-3">فتح</a>
                  <button onClick={() => deleteMutation.mutate(link._id)} className="text-red-400 hover:text-red-300 text-xs transition-colors">حذف</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة رابط اجتماع" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
          <Button variant="gold" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending} disabled={!form.link}>حفظ</Button>
        </>}
      >
        <div className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">المنصة</label>
            <select name="provider" value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} className="field w-full">
              {providers.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">التسمية (اختياري)</label>
            <input type="text" name="label" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} className="field w-full" placeholder="مثال: غرفتي الدائمة" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1.5">الرابط</label>
            <input type="url" name="link" value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} className="field w-full" placeholder="https://..." />
          </div>
        </div>
      </Modal>
    </div>
  )
}
