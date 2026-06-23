import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

const sections = [
  { key: 'testimonials', label: 'آراء الطلاب' },
  { key: 'faqs', label: 'الأسئلة الشائعة' },
  { key: 'website_settings', label: 'إعدادات الموقع' },
]

export default function AdminWebsitePage() {
  const [activeSection, setActiveSection] = useState('testimonials')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ nameAr: '', bodyAr: '', rating: 5, questionAr: '', answerAr: '' })
  const qc = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'website', activeSection],
    queryFn: () => api.get(`/website/${activeSection}`).then(r => r.data.data),
    enabled: activeSection !== 'website_settings',
  })

  const { data: settings } = useQuery({
    queryKey: ['admin', 'website', 'website_settings'],
    queryFn: () => api.get('/website/settings').then(r => r.data.data),
    enabled: activeSection === 'website_settings',
    placeholderData: {},
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/website/${activeSection}`, data),
    onSuccess: () => { toast.success('تم الإضافة بنجاح'); qc.invalidateQueries({ queryKey: ['admin', 'website', activeSection] }); setShowCreate(false) },
    onError: () => toast.error('حدث خطأ'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/website/${activeSection}/${id}`),
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['admin', 'website', activeSection] }) },
  })

  return (
    <div dir="rtl">
      <PageHeader title="إعدادات الموقع" subtitle="إدارة محتوى الصفحة الرئيسية" />

      <div className="flex gap-1 mb-6 p-1 bg-[#f0ecf8] rounded-xl w-fit">
        {sections.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className={`px-5 py-2 rounded-[10px] text-sm font-semibold transition-all ${activeSection === s.key ? 'bg-white text-brand-textBody shadow-sm' : 'text-[#9b7fd6] hover:text-brand-textBody'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {activeSection === 'testimonials' && (
        <>
          <div className="flex justify-end mb-4">
            <Button variant="purple" size="sm" onClick={() => setShowCreate(true)}>+ إضافة شهادة</Button>
          </div>
          {isLoading ? <Spinner color="border-brand-purple" /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((t) => (
                <div key={t._id} className="card-light p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-brand-textBody">{t.nameAr}</div>
                    <button onClick={() => deleteMutation.mutate(t._id)} className="text-red-400 text-xs hover:text-red-600">حذف</button>
                  </div>
                  <p className="text-sm text-[#9b7fd6]">{t.bodyAr}</p>
                  <div className="text-brand-gold mt-2">{'★'.repeat(t.rating || 5)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeSection === 'faqs' && (
        <>
          <div className="flex justify-end mb-4">
            <Button variant="purple" size="sm" onClick={() => setShowCreate(true)}>+ إضافة سؤال</Button>
          </div>
          {isLoading ? <Spinner color="border-brand-purple" /> : (
            <div className="space-y-3">
              {items.map((f) => (
                <div key={f._id} className="card-light p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-brand-textBody mb-2">{f.questionAr}</div>
                      <p className="text-sm text-[#9b7fd6]">{f.answerAr}</p>
                    </div>
                    <button onClick={() => deleteMutation.mutate(f._id)} className="text-red-400 text-xs hover:text-red-600 flex-none">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeSection === 'website_settings' && (
        <div className="card-light p-6">
          <h2 className="font-heading font-bold text-brand-textBody mb-4">إعدادات الموقع العامة</h2>
          <p className="text-[#9b7fd6] text-sm">سيتم إضافة إعدادات الموقع قريباً.</p>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={activeSection === 'testimonials' ? 'إضافة شهادة' : 'إضافة سؤال'} size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
          <Button variant="purple" onClick={() => createMutation.mutate(form)} loading={createMutation.isPending}>إضافة</Button>
        </>}
      >
        <div className="space-y-4">
          {activeSection === 'testimonials' ? (
            <>
              <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الاسم</label><input value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} className="field-light w-full" /></div>
              <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الشهادة</label><textarea value={form.bodyAr} onChange={e => setForm(p => ({ ...p, bodyAr: e.target.value }))} rows={3} className="field-light resize-none w-full" /></div>
              <div><label className="block text-xs font-semibold text-brand-textBody mb-1">التقييم (١-٥)</label><input type="number" min="1" max="5" value={form.rating} onChange={e => setForm(p => ({ ...p, rating: Number(e.target.value) }))} className="field-light w-full" /></div>
            </>
          ) : (
            <>
              <div><label className="block text-xs font-semibold text-brand-textBody mb-1">السؤال</label><input value={form.questionAr} onChange={e => setForm(p => ({ ...p, questionAr: e.target.value }))} className="field-light w-full" /></div>
              <div><label className="block text-xs font-semibold text-brand-textBody mb-1">الإجابة</label><textarea value={form.answerAr} onChange={e => setForm(p => ({ ...p, answerAr: e.target.value }))} rows={4} className="field-light resize-none w-full" /></div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
