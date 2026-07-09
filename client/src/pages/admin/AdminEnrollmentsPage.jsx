import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ClipboardList, Check } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr } from '../../utils/date.js'
import { getFileUrl } from '../../config/constants.js'

const STATUS_CONFIG = {
  pending: { label: 'قيد الانتظار', variant: 'warning' },
  under_review: { label: 'قيد المراجعة', variant: 'info' },
  approved: { label: 'تمت الموافقة', variant: 'success' },
  rejected: { label: 'مرفوض', variant: 'danger' },
}

const PAYMENT_METHOD_LABELS = {
  bank_transfer: 'حوالة بنكية',
  cash: 'نقداً',
  card: 'بطاقة ائتمانية',
  other: 'أخرى',
}

const STATUS_FILTER_TABS = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'approved', label: 'تمت الموافقة' },
  { value: 'rejected', label: 'مرفوض' },
]

export default function AdminEnrollmentsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showProof, setShowProof] = useState(false)
  const [reviewForm, setReviewForm] = useState({ action: 'approved', teacherId: '', levelId: '', groupName: '', adminNotes: '', startDate: '' })
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'enrollments', page, statusFilter],
    queryFn: () => api.get(`/enrollments?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`).then(r => r.data),
    placeholderData: { data: [], totalPages: 1 },
  })

  const { data: pendingCount } = useQuery({
    queryKey: ['admin', 'enrollments', 'pending-count'],
    queryFn: () => api.get('/enrollments/pending-count').then(r => r.data.data?.count || 0),
    refetchInterval: 30000,
  })

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin', 'teachers', 'all'],
    queryFn: () => api.get('/admin/teachers?limit=100').then(r => r.data.data || []),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/enrollments/${id}/review`, body),
    onSuccess: (_, vars) => {
      toast.success(vars.action === 'approved' ? 'تمت الموافقة وتفعيل الاشتراك' : 'تم رفض الطلب')
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      setSelectedRequest(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  function openReview(req) {
    setSelectedRequest(req)
    setReviewForm({ action: 'approved', teacherId: '', levelId: '', groupName: '', adminNotes: '', startDate: '' })
  }

  function submitReview() {
    if (reviewForm.action === 'approved' && !reviewForm.teacherId) {
      return toast.error('يجب تحديد المعلم عند الموافقة')
    }
    reviewMutation.mutate({ id: selectedRequest._id, ...reviewForm })
  }

  const requests = data?.data || []

  return (
    <div dir="rtl">
      <PageHeader
        title="طلبات التسجيل"
        subtitle="مراجعة وإقرار طلبات تسجيل الطلاب"
        actions={
          pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-600 font-bold text-sm">{pendingCount} طلب جديد</span>
            </div>
          )
        }
      />

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === tab.value
                ? 'bg-brand-purple text-white shadow-md'
                : 'bg-white text-[#9b7fd6] border border-[#e8e0f5] hover:bg-[#f5f0ff]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !requests.length ? (
        <div className="card-light p-12 text-center">
          <ClipboardList size={52} strokeWidth={1.3} color="#9b7fd6" className="mb-4 mx-auto" />
          <h3 className="font-heading font-bold text-lg text-brand-textBody mb-2">لا توجد طلبات</h3>
          <p className="text-[#9b7fd6] text-sm">لم يتم إيجاد أي طلبات تسجيل بهذه الحالة</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req._id} className="card-light p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Student info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={getFileUrl(req.studentId?.avatar)} firstName={req.studentId?.firstNameAr} lastName={req.studentId?.lastNameAr} size="md" />
                    <div className="min-w-0">
                      <div className="font-bold text-brand-textBody truncate">{req.studentId?.firstNameAr} {req.studentId?.lastNameAr}</div>
                      <div className="text-xs text-[#9b7fd6] truncate">{req.studentId?.email}</div>
                      {req.studentId?.phone && <div className="text-xs text-[#9b7fd6]">{req.studentId.phone}</div>}
                    </div>
                  </div>

                  {/* Package info */}
                  <div className="flex-none sm:w-44">
                    <div className="font-semibold text-sm text-brand-textBody">{req.packageId?.nameAr}</div>
                    <div className="text-xs text-[#9b7fd6]">{req.amount} ريال — {PAYMENT_METHOD_LABELS[req.paymentMethod] || req.paymentMethod}</div>
                    {req.paymentReference && <div className="text-xs text-[#9b7fd6]">Ref: {req.paymentReference}</div>}
                  </div>

                  {/* Date */}
                  <div className="flex-none text-xs text-[#9b7fd6] sm:w-24 text-center">{formatDateAr(req.createdAt)}</div>

                  {/* Status */}
                  <div className="flex-none sm:w-32 text-center">
                    <Badge variant={STATUS_CONFIG[req.status]?.variant || 'gray'}>{STATUS_CONFIG[req.status]?.label || req.status}</Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex-none flex items-center gap-2">
                    {req.paymentProofUrl && (
                      <button
                        onClick={() => { setSelectedRequest(req); setShowProof(true) }}
                        className="text-xs text-brand-purple hover:underline font-semibold flex items-center gap-1"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                        إثبات
                      </button>
                    )}
                    {['pending', 'under_review'].includes(req.status) && (
                      <Button size="sm" variant="purple" onClick={() => openReview(req)}>مراجعة</Button>
                    )}
                    {req.status === 'approved' && (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        مُعتمد <Check size={13} strokeWidth={2.5} /> {req.teacherId && `• ${req.teacherId.firstNameAr}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Student notes */}
                {req.studentNotes && (
                  <div className="mt-3 pt-3 border-t border-[#f0ecf8]">
                    <span className="text-xs font-bold text-[#9b7fd6]">ملاحظة الطالب: </span>
                    <span className="text-xs text-brand-textBody">{req.studentNotes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {data?.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination current={page} total={data.totalPages} onChange={setPage} />
            </div>
          )}
        </>
      )}

      {/* Payment proof modal */}
      <Modal
        open={showProof && !!selectedRequest?.paymentProofUrl}
        onClose={() => { setShowProof(false); setSelectedRequest(null) }}
        title="إثبات الدفع"
        size="md"
        footer={<Button variant="ghost" onClick={() => { setShowProof(false); setSelectedRequest(null) }}>إغلاق</Button>}
      >
        <div className="text-center">
          <img src={getFileUrl(selectedRequest?.paymentProofUrl)} alt="إثبات الدفع" className="max-w-full max-h-[70vh] object-contain rounded-xl mx-auto border border-[#e8e0f5]" />
          <div className="mt-3 text-sm text-[#9b7fd6]">
            رُفع بواسطة: {selectedRequest?.studentId?.firstNameAr} — {formatDateAr(selectedRequest?.updatedAt)}
          </div>
        </div>
      </Modal>

      {/* Review modal */}
      <Modal
        open={!!selectedRequest && !showProof}
        onClose={() => setSelectedRequest(null)}
        title="مراجعة طلب التسجيل"
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="ghost" onClick={() => setSelectedRequest(null)}>إلغاء</Button>
            <Button
              variant={reviewForm.action === 'approved' ? 'purple' : 'danger'}
              onClick={submitReview}
              loading={reviewMutation.isPending}
            >
              {reviewForm.action === 'approved' ? 'موافقة وتفعيل الاشتراك' : 'رفض الطلب'}
            </Button>
          </div>
        }
      >
        {selectedRequest && (
          <div className="space-y-5">
            {/* Student summary */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#f8f5ff]">
              <Avatar src={getFileUrl(selectedRequest.studentId?.avatar)} firstName={selectedRequest.studentId?.firstNameAr} lastName={selectedRequest.studentId?.lastNameAr} size="md" />
              <div>
                <div className="font-bold text-brand-textBody">{selectedRequest.studentId?.firstNameAr} {selectedRequest.studentId?.lastNameAr}</div>
                <div className="text-sm text-[#9b7fd6]">{selectedRequest.studentId?.email} {selectedRequest.studentId?.phone && `| ${selectedRequest.studentId.phone}`}</div>
                <div className="text-sm text-[#9b7fd6]">الباقة: <span className="font-semibold">{selectedRequest.packageId?.nameAr}</span> — {selectedRequest.amount} ريال</div>
              </div>
              {selectedRequest.paymentProofUrl && (
                <button onClick={() => setShowProof(true)} className="mr-auto text-xs text-brand-purple hover:underline font-semibold">عرض إثبات الدفع</button>
              )}
            </div>

            {/* Action choice */}
            <div>
              <label className="block text-xs font-bold text-brand-textBody mb-2">الإجراء</label>
              <div className="flex gap-3">
                {[
                  { value: 'approved', label: 'موافقة', color: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
                  { value: 'rejected', label: 'رفض', color: 'bg-red-50 border-red-300 text-red-700' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setReviewForm(p => ({ ...p, action: opt.value }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                      reviewForm.action === opt.value ? opt.color + ' border-2' : 'border-[#e0d8f5] text-[#9b7fd6]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Approval fields */}
            {reviewForm.action === 'approved' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-brand-textBody mb-1.5">تعيين المعلم <span className="text-red-500">*</span></label>
                  <select
                    value={reviewForm.teacherId}
                    onChange={e => setReviewForm(p => ({ ...p, teacherId: e.target.value }))}
                    className="field-light w-full"
                  >
                    <option value="">اختر معلماً</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>{t.firstNameAr} {t.lastNameAr}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-textBody mb-1.5">المستوى</label>
                    <input
                      type="text"
                      placeholder="مثال: مبتدئ، متوسط"
                      value={reviewForm.levelId}
                      onChange={e => setReviewForm(p => ({ ...p, levelId: e.target.value }))}
                      className="field-light w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-textBody mb-1.5">اسم المجموعة</label>
                    <input
                      type="text"
                      placeholder="مثال: مجموعة أ"
                      value={reviewForm.groupName}
                      onChange={e => setReviewForm(p => ({ ...p, groupName: e.target.value }))}
                      className="field-light w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-textBody mb-1.5">تاريخ بدء الاشتراك</label>
                  <input
                    type="date"
                    value={reviewForm.startDate}
                    onChange={e => setReviewForm(p => ({ ...p, startDate: e.target.value }))}
                    className="field-light w-full"
                  />
                  <p className="text-xs text-[#9b7fd6] mt-1">اتركه فارغاً لتفعيل الاشتراك من اليوم</p>
                </div>
              </>
            )}

            {/* Admin notes */}
            <div>
              <label className="block text-xs font-bold text-brand-textBody mb-1.5">
                {reviewForm.action === 'approved' ? 'ملاحظات (اختياري)' : 'سبب الرفض (مطلوب)'}
              </label>
              <textarea
                rows={3}
                placeholder={reviewForm.action === 'approved' ? 'أي ملاحظات للطالب أو للمعلم...' : 'اذكر السبب حتى يتمكن الطالب من التصحيح...'}
                value={reviewForm.adminNotes}
                onChange={e => setReviewForm(p => ({ ...p, adminNotes: e.target.value }))}
                className="field-light w-full resize-none"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
