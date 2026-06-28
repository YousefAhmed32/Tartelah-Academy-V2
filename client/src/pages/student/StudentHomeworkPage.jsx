import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Paperclip, X, FileText, Image as ImageIcon, Star, Check } from 'lucide-react'
import api from '../../utils/api.js'
import { getFileUrl } from '../../config/constants.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'
import { formatDateAr } from '../../utils/date.js'

const MAX_FILES = 3
const MAX_SIZE_MB = 20

export default function StudentHomeworkPage() {
  const [selected, setSelected] = useState(null)
  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const fileInputRef = useRef(null)
  const qc = useQueryClient()

  const { data: homework = [], isLoading } = useQuery({
    queryKey: ['homework', 'student'],
    queryFn: () => api.get('/homework').then(r => r.data.data),
  })

  const submitMutation = useMutation({
    mutationFn: ({ id, content, files }) => {
      const formData = new FormData()
      if (content.trim()) formData.append('content', content)
      files.forEach(f => formData.append('files', f))
      return api.post(`/homework/${id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      toast.success('تم تسليم الواجب بنجاح')
      qc.invalidateQueries({ queryKey: ['homework', 'student'] })
      setSelected(null)
      setContent('')
      setFiles([])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  function handleFileChange(e) {
    const picked = Array.from(e.target.files || [])
    const total = [...files, ...picked]
    if (total.length > MAX_FILES) { toast.error(`الحد الأقصى ${MAX_FILES} ملفات`); return }
    const oversized = picked.filter(f => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (oversized.length) { toast.error(`حجم الملف يتجاوز ${MAX_SIZE_MB} ميجابايت`); return }
    setFiles(total.slice(0, MAX_FILES))
    e.target.value = ''
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function openSubmit(hw) {
    setSelected(hw)
    setContent('')
    setFiles([])
  }

  const canSubmit = content.trim().length > 0 || files.length > 0

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
          {homework.map((hw) => {
            const mySubmission = hw.submissions?.find(s => s.studentId === hw._myId || s.content)
            return (
              <div key={hw._id} className="card-light p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-bold text-brand-textBody">{hw.titleAr || hw.title}</div>
                  {hw.descriptionAr && <p className="text-sm text-[#9b7fd6] mt-1 line-clamp-2">{hw.descriptionAr}</p>}
                  <div className="text-xs text-[#9b7fd6] mt-2">تاريخ التسليم: {formatDateAr(hw.dueDate)}</div>
                  {mySubmission?.grade !== undefined && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg">
                      <span className="text-xs font-bold text-amber-600 flex items-center gap-1"><Star size={12} strokeWidth={0} fill="#d97706" /> {mySubmission.grade}/10</span>
                      {mySubmission.teacherFeedback && (
                        <span className="text-xs text-amber-700 line-clamp-1">{mySubmission.teacherFeedback}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={hw.status === 'completed' ? 'success' : hw.status === 'overdue' ? 'danger' : 'warning'}>
                    {hw.status === 'completed' ? 'مكتمل' : hw.status === 'overdue' ? 'متأخر' : 'معلق'}
                  </Badge>
                  {hw.status === 'active' && !mySubmission && (
                    <Button size="sm" variant="purple" onClick={() => openSubmit(hw)}>تسليم</Button>
                  )}
                  {mySubmission && <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><Check size={13} strokeWidth={2.5} /> مُسلَّم</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`تسليم: ${selected?.titleAr || selected?.title || ''}`}
        size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setSelected(null)}>إلغاء</Button>
          <Button variant="purple"
            onClick={() => submitMutation.mutate({ id: selected._id, content, files })}
            loading={submitMutation.isPending}
            disabled={!canSubmit}>
            تسليم الواجب
          </Button>
        </>}
      >
        <div className="space-y-4" dir="rtl">
          {selected?.descriptionAr && (
            <div className="p-4 rounded-xl bg-[#f8f5ff] text-sm text-[#9b7fd6]">{selected.descriptionAr}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-brand-textBody mb-1.5">إجابتك (اختياري مع الملفات)</label>
            <textarea rows={4} value={content} onChange={e => setContent(e.target.value)}
              className="field-light resize-none" placeholder="اكتب إجابتك هنا..." />
          </div>

          {/* File attachment area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-brand-textBody">المرفقات</label>
              <span className="text-xs text-[#9b7fd6]">{files.length}/{MAX_FILES} ملف · حتى {MAX_SIZE_MB} MB</span>
            </div>

            {/* Existing files */}
            {files.length > 0 && (
              <div className="space-y-2 mb-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-[#f8f5ff] rounded-xl">
                    {f.type.startsWith('image/') ? <ImageIcon size={14} className="text-violet-500 flex-none" /> : <FileText size={14} className="text-violet-500 flex-none" />}
                    <span className="flex-1 text-xs text-brand-textBody truncate">{f.name}</span>
                    <span className="text-xs text-[#9b7fd6]">{(f.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600 p-0.5"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}

            {files.length < MAX_FILES && (
              <>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,audio/*,video/mp4" className="hidden" onChange={handleFileChange} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-[#d0c4f0] rounded-xl text-sm text-[#9b7fd6] hover:border-brand-purple hover:text-brand-purple transition-colors flex items-center justify-center gap-2">
                  <Paperclip size={14} />
                  أضف ملف (صورة، PDF، صوت)
                </button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
