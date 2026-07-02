import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Link2, Video, MonitorPlay, Briefcase } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import { MEETING_PROVIDERS } from '../../config/constants.js'
import { SkeletonCardGrid } from '../../components/ui/Skeleton.jsx'
import ErrorState from '../../components/shared/ErrorState.jsx'
import { toArray } from '../../utils/format.js'

export default function TeacherLinksPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ provider: 'zoom', label: '', link: '' })
  const qc = useQueryClient()

  const { data: links = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['teacher', 'links'],
    queryFn: () => api.get('/teachers/me/links').then(r => toArray(r.data?.data)),
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
        actions={<Button variant="purple" onClick={() => setShowModal(true)}>+ إضافة رابط</Button>}
      />

      {isLoading ? (
        <SkeletonCardGrid count={4} cols="md:grid-cols-2" />
      ) : isError ? (
        <ErrorState onRetry={refetch} isRetrying={isFetching} />
      ) : !links.length ? (
        <div className="rounded-2xl p-12 text-center bg-white border-2 border-dashed border-gray-200">
          <Link2 size={52} strokeWidth={1.3} className="mb-4 mx-auto text-gray-300" />
          <p className="text-gray-900 font-heading font-bold text-lg mb-2">لا توجد روابط محفوظة</p>
          <p className="text-sm text-gray-500">أضف روابط الاجتماع الخاصة بك للاستخدام السريع</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((link, i) => {
            const provider = MEETING_PROVIDERS[link.provider]
            return (
              <motion.div key={link._id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
                whileHover={{ y: -3, boxShadow: '0 12px 28px rgba(15,23,42,0.08)' }}
                className="rounded-2xl p-5 flex items-center gap-4 transition-all bg-white border border-gray-100 shadow-sm">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-none" style={{ background: `${provider?.color || '#7c3aed'}18` }}>
                  {link.provider === 'zoom' ? <Video size={20} strokeWidth={1.8} color={provider?.color || '#7c3aed'} /> : link.provider === 'meet' ? <MonitorPlay size={20} strokeWidth={1.8} color={provider?.color || '#7c3aed'} /> : link.provider === 'teams' ? <Briefcase size={20} strokeWidth={1.8} color={provider?.color || '#7c3aed'} /> : <Link2 size={20} strokeWidth={1.8} color={provider?.color || '#7c3aed'} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900 font-semibold">{link.label || provider?.label}</div>
                  <a href={link.link} target="_blank" rel="noopener noreferrer" className="text-xs truncate block mt-0.5 text-gray-500">{link.link}</a>
                </div>
                <div className="flex items-center gap-2">
                  <a href={link.link} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors">فتح</a>
                  <button onClick={() => deleteMutation.mutate(link._id)} className="text-red-500 hover:text-red-600 text-xs transition-colors font-semibold">حذف</button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="إضافة رابط اجتماع"
        size="sm"
        footer={
          <>
            <Button variant="ghost" className="!bg-gray-100 !text-gray-600 hover:!bg-gray-200 !border-transparent" onClick={() => setShowModal(false)}>إلغاء</Button>
            <Button variant="purple" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending} disabled={!form.link}>
              حفظ الرابط
            </Button>
          </>
        }
      >
        <div className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-semibold text-brand-textBody mb-1.5">المنصة</label>
            <select
              name="provider"
              value={form.provider}
              onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
              className="field-light w-full"
            >
              {providers.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-brand-textBody mb-1.5">التسمية (اختياري)</label>
            <input
              type="text"
              name="label"
              value={form.label}
              onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
              className="field-light w-full"
              placeholder="مثال: غرفتي الدائمة"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-brand-textBody mb-1.5">الرابط <span className="text-red-500">*</span></label>
            <input
              type="url"
              name="link"
              value={form.link}
              onChange={e => setForm(p => ({ ...p, link: e.target.value }))}
              className="field-light w-full"
              placeholder="https://..."
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
