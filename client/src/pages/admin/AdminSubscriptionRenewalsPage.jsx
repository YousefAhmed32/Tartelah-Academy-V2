import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { RefreshCw, Check, Plus } from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Pagination from '../../components/ui/Pagination.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import PrivateImage from '../../components/ui/PrivateImage.jsx'
import DirectRenewalModal from '../../components/admin/DirectRenewalModal.jsx'
import { formatDateAr } from '../../utils/date.js'
import { formatCurrency } from '../../utils/format.js'
import { renewalService } from '../../services/renewal.service.js'

const inputCls = 'w-full h-10 bg-gray-50 border border-gray-200 rounded-xl px-3.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all'

const STATUS_CONFIG = {
  pending: { label: 'بانتظار إثبات الدفع', variant: 'gray' },
  under_review: { label: 'قيد المراجعة', variant: 'warning' },
  approved: { label: 'تمت الموافقة', variant: 'success' },
  rejected: { label: 'مرفوض', variant: 'danger' },
  cancelled: { label: 'ملغى', variant: 'gray' },
  expired: { label: 'منتهي', variant: 'gray' },
}
const STATUS_FILTER_TABS = [
  { value: '', label: 'الكل' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'approved', label: 'تمت الموافقة' },
  { value: 'rejected', label: 'مرفوض' },
]

// Subscription-renewal review queue (Phase 2 §9) — mirrors
// AdminEnrollmentsPage.jsx's proven submit/proof/review shape, simplified
// since a renewal keeps the same teacher/schedule by default (only a real
// teacher-change request needs the existing transfer.service.js primitive,
// invoked automatically on approval — see renewal.service.js).
export default function AdminSubscriptionRenewalsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showProof, setShowProof] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [directRenewalOpen, setDirectRenewalOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'subscription-renewals', page, statusFilter],
    queryFn: () => renewalService.getAllRequests({ page, limit: 20, status: statusFilter || undefined }).then(r => r.data),
    placeholderData: (prev) => prev,
  })
  const { data: pendingCount } = useQuery({
    queryKey: ['admin', 'subscription-renewals', 'pending-count'],
    queryFn: () => renewalService.getPendingCount().then(r => r.data.data?.count || 0),
    refetchInterval: 30000,
  })

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }) => renewalService.reviewRequest(id, { action, adminNotes }),
    onSuccess: (_, vars) => {
      toast.success(vars.action === 'approved' ? 'تمت الموافقة وتجديد الاشتراك' : 'تم رفض الطلب')
      qc.invalidateQueries({ queryKey: ['admin', 'subscription-renewals'] })
      setReviewOpen(false); setSelectedRequest(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ'),
  })

  const requests = data?.data || []
  const teacherChanged = (r) => r.requestedTeacherId && r.currentSubscriptionId?.teacherId && String(r.requestedTeacherId._id) !== String(r.currentSubscriptionId.teacherId)

  return (
    <div dir="rtl">
      <PageHeader
        title="طلبات تجديد الاشتراك"
        subtitle="مراجعة وإقرار طلبات تجديد اشتراكات الطلاب أو التجديد المباشر"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-600 font-bold text-xs">{pendingCount} طلب بحاجة مراجعة</span>
              </div>
            )}
            <Button
              variant="purple"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setDirectRenewalOpen(true)}
            >
              تجديد اشتراك مباشر
            </Button>
          </div>
        }
      />

      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_FILTER_TABS.map(tab => (
          <button key={tab.value} onClick={() => { setStatusFilter(tab.value); setPage(1) }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${statusFilter === tab.value ? 'bg-brand-purple text-white shadow-md' : 'bg-white text-[#7c6aaa] border border-[#e8e0f5] hover:bg-[#f5f0ff]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-purple" /></div>
      ) : !requests.length ? (
        <div className="card-light p-12 text-center">
          <RefreshCw size={52} strokeWidth={1.3} color="#7c6aaa" className="mb-4 mx-auto" />
          <h3 className="font-heading font-bold text-lg text-brand-textBody mb-2">لا توجد طلبات</h3>
          <p className="text-[#7c6aaa] text-sm">لم يتم إيجاد أي طلبات تجديد بهذه الحالة</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req._id} className="card-light p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar firstName={req.studentId?.firstNameAr} lastName={req.studentId?.lastNameAr} size="md" />
                    <div className="min-w-0">
                      <div className="font-bold text-brand-textBody truncate">{req.studentId?.firstNameAr} {req.studentId?.lastNameAr}</div>
                      <div className="text-xs text-[#7c6aaa] truncate">{req.studentId?.email}</div>
                    </div>
                  </div>
                  <div className="flex-none sm:w-44">
                    <div className="font-semibold text-sm text-brand-textBody">{req.requestedPackageId?.nameAr}</div>
                    <div className="text-xs text-[#7c6aaa]">{formatCurrency(req.amount)}</div>
                    {teacherChanged(req) && <div className="text-[11px] text-amber-600 font-semibold">طلب تغيير معلم إلى {req.requestedTeacherId?.firstNameAr}</div>}
                  </div>
                  <div className="flex-none text-xs text-[#7c6aaa] sm:w-24 text-center">{formatDateAr(req.createdAt)}</div>
                  <div className="flex-none sm:w-32 text-center"><Badge variant={STATUS_CONFIG[req.status]?.variant}>{STATUS_CONFIG[req.status]?.label}</Badge></div>
                  <div className="flex-none flex items-center gap-2">
                    {req.paymentProofId && (
                      <button onClick={() => { setSelectedRequest(req); setShowProof(true) }} className="text-xs text-brand-purple hover:underline font-semibold">إثبات الدفع</button>
                    )}
                    {req.status === 'under_review' && (
                      <Button size="sm" variant="purple" onClick={() => { setSelectedRequest(req); setAdminNotes(''); setReviewOpen(true) }}>مراجعة</Button>
                    )}
                    {req.status === 'approved' && (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">مُجدَّد <Check size={13} strokeWidth={2.5} /></span>
                    )}
                  </div>
                </div>
                {req.studentNotes && (
                  <div className="mt-3 pt-3 border-t border-[#f0ecf8]">
                    <span className="text-xs font-bold text-[#7c6aaa]">ملاحظة الطالب: </span>
                    <span className="text-xs text-brand-textBody">{req.studentNotes}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {data?.totalPages > 1 && <div className="mt-6 flex justify-center"><Pagination current={page} total={data.totalPages} onChange={setPage} /></div>}
        </>
      )}

      <Modal open={showProof && !!selectedRequest?.paymentProofId} onClose={() => { setShowProof(false); setSelectedRequest(null) }}
        title="إثبات الدفع" size="md" footer={<Button variant="ghost" onClick={() => { setShowProof(false); setSelectedRequest(null) }}>إغلاق</Button>}>
        <div className="text-center">
          <PrivateImage src={selectedRequest?.paymentProofId} alt="إثبات الدفع" className="max-w-full max-h-[70vh] object-contain rounded-xl mx-auto border border-[#e8e0f5]" />
        </div>
      </Modal>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title="مراجعة طلب التجديد" size="md"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>إلغاء</Button>
            <Button variant="danger" loading={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: selectedRequest._id, action: 'rejected' })}>رفض</Button>
            <Button variant="purple" loading={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ id: selectedRequest._id, action: 'approved' })}>
              {teacherChanged(selectedRequest || {}) ? 'موافقة وتجديد ونقل للمعلم الجديد' : 'موافقة وتجديد الاشتراك'}
            </Button>
          </div>
        }>
        {selectedRequest && (
          <div dir="rtl" className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-3 text-sm space-y-1">
              <div>الطالب: <b>{selectedRequest.studentId?.firstNameAr} {selectedRequest.studentId?.lastNameAr}</b></div>
              <div>الباقة المطلوبة: <b>{selectedRequest.requestedPackageId?.nameAr}</b> ({formatCurrency(selectedRequest.amount)})</div>
              {teacherChanged(selectedRequest) && (
                <div className="text-amber-700">سيتم نقل الطالب تلقائيًا إلى {selectedRequest.requestedTeacherId?.firstNameAr} {selectedRequest.requestedTeacherId?.lastNameAr} عند الموافقة — سيُرفض الطلب إن لم يتوفر موعد الطالب لدى المعلم الجديد.</div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات الإدارة</label>
              <textarea className={`${inputCls} h-20 py-2 resize-none`} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="سبب الرفض إن وُجد، أو ملاحظة داخلية" />
            </div>
          </div>
        )}
      </Modal>

      {directRenewalOpen && (
        <DirectRenewalModal
          open={directRenewalOpen}
          onClose={() => setDirectRenewalOpen(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'subscription-renewals'] })
          }}
        />
      )}
    </div>
  )
}
