import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import { formatDateAr } from '../../utils/date.js'

export default function StudentHomeworkPage() {
  const [selected, setSelected] = useState(null)
  const [content, setContent] = useState('')
  const qc = useQueryClient()

  const { data: homework = [], isLoading } = useQuery({
    queryKey: ['homework', 'student'],
    queryFn: () => api.get('/homework').then(r => r.data.data),
  })

  const submitMutation = useMutation({
    mutationFn: ({ id, content }) => api.post(`/homework/${id}/submit`, { content }),
    onSuccess: () => {
      toast.success('تم تسليم الواجب بنجاح')
      qc.invalidateQueries({ queryKey: ['homework', 'student'] })
      setSelected(null)
      setContent('')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  return (
    <div dir="rtl">
      <PageHeader title="الواجبات" subtitle="متابعة وتسليم الواجبات الدراسية" />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !homework.length ? (
        <EmptyState
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M8 4h8l3 3v13H5V4h3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>}
          title="لا توجد واجبات"
          description="لم يتم تعيين أي واجبات حتى الآن"
        />
      ) : (
        <div className="space-y-3">
          {homework.map((hw) => (
            <div key={hw._id} className="card-light p-5 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-heading font-bold text-brand-textBody">{hw.titleAr || hw.title}</div>
                {hw.descriptionAr && <p className="text-sm text-[#9b7fd6] mt-1 line-clamp-2">{hw.descriptionAr}</p>}
                <div className="text-xs text-[#9b7fd6] mt-2">تاريخ التسليم: {formatDateAr(hw.dueDate)}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={hw.status === 'completed' ? 'success' : hw.status === 'overdue' ? 'danger' : 'warning'}>
                  {hw.status === 'completed' ? 'مكتمل' : hw.status === 'overdue' ? 'متأخر' : 'معلق'}
                </Badge>
                {hw.status === 'active' && (
                  <Button size="sm" variant="purple" onClick={() => { setSelected(hw); setContent('') }}>
                    تسليم
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`تسليم: ${selected?.titleAr || selected?.title || ''}`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>إلغاء</Button>
            <Button
              variant="purple"
              onClick={() => submitMutation.mutate({ id: selected._id, content })}
              loading={submitMutation.isPending}
              disabled={!content.trim()}
            >
              تسليم الواجب
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {selected?.descriptionAr && (
            <div className="p-4 rounded-xl bg-[#f8f5ff] text-sm text-[#9b7fd6]">{selected.descriptionAr}</div>
          )}
          <div>
            <label className="block text-sm font-semibold text-brand-textBody mb-1.5">إجابتك</label>
            <textarea
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="field-light resize-none"
              placeholder="اكتب إجابتك هنا..."
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
