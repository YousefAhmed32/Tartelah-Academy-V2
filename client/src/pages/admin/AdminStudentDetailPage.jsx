import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ArrowRight, Star, BookOpen, ClipboardList, CheckCircle, XCircle, Clock, Edit2, Trash2 } from 'lucide-react'
import api from '../../utils/api.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import { formatDateAr, formatDateTimeAr } from '../../utils/date.js'
import { ROUTES } from '../../config/constants.js'

const TAB_KEYS = ['evaluations', 'attendance', 'homework', 'memorization', 'revision']
const TAB_LABELS = {
  evaluations: 'التقييمات',
  attendance: 'الحضور',
  homework: 'الواجبات',
  memorization: 'الحفظ',
  revision: 'المراجعة',
}

// ── Edit Evaluation Modal ─────────────────────────────────────────────────────

function EditEvalModal({ ev, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    score: ev.score || '',
    notesAr: ev.notesAr || '',
    type: ev.type || 'monthly',
    isSharedWithStudent: ev.isSharedWithStudent ?? true,
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const mut = useMutation({
    mutationFn: (data) => api.patch(`/admin/evaluations/${ev._id}`, data).then(r => r.data),
    onSuccess: () => { toast.success('تم تحديث التقييم'); qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics'] }); onClose() },
    onError: (e) => toast.error(e?.response?.data?.message || 'خطأ'),
  })

  return (
    <Modal open onClose={onClose} title="تعديل التقييم" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button variant="purple" onClick={() => mut.mutate(form)} loading={mut.isPending}>حفظ</Button>
      </>}>
      <div className="space-y-4" dir="rtl">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">الدرجة (من 10)</label>
          <input type="number" min="0" max="10" step="0.5" value={form.score} onChange={e => set('score', e.target.value)} className="field-light w-full" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">النوع</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="field-light w-full">
            <option value="monthly">شهري</option>
            <option value="weekly">أسبوعي</option>
            <option value="session">حصة</option>
            <option value="final">نهائي</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات</label>
          <textarea value={form.notesAr} onChange={e => set('notesAr', e.target.value)} className="field-light w-full h-20 resize-none" placeholder="ملاحظات التقييم..." />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isSharedWithStudent} onChange={e => set('isSharedWithStudent', e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700">مشترك مع الطالب</span>
        </label>
      </div>
    </Modal>
  )
}

// ── Edit Attendance Modal ─────────────────────────────────────────────────────

function EditAttModal({ att, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ status: att.status, notes: att.notes || '' })

  const mut = useMutation({
    mutationFn: (data) => api.patch(`/admin/attendance/${att._id}`, data).then(r => r.data),
    onSuccess: () => { toast.success('تم تحديث الحضور'); qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics'] }); onClose() },
    onError: (e) => toast.error(e?.response?.data?.message || 'خطأ'),
  })

  return (
    <Modal open onClose={onClose} title="تعديل سجل الحضور" size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>إلغاء</Button>
        <Button variant="purple" onClick={() => mut.mutate(form)} loading={mut.isPending}>حفظ</Button>
      </>}>
      <div className="space-y-4" dir="rtl">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">الحالة</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="field-light w-full">
            <option value="present">حاضر</option>
            <option value="absent">غائب</option>
            <option value="late">متأخر</option>
            <option value="excused">معذور</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">ملاحظات</label>
          <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="field-light w-full" placeholder="ملاحظات..." />
        </div>
      </div>
    </Modal>
  )
}

// ── Attendance status helpers ─────────────────────────────────────────────────

const ATT_CFG = {
  present: { label: 'حاضر', badge: 'success', Icon: CheckCircle },
  absent:  { label: 'غائب',  badge: 'danger',  Icon: XCircle },
  late:    { label: 'متأخر', badge: 'warning', Icon: Clock },
  excused: { label: 'معذور', badge: 'purple',  Icon: Clock },
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminStudentDetailPage() {
  const { id } = useParams()
  const [tab, setTab] = useState('evaluations')
  const [editEv, setEditEv] = useState(null)
  const [editAtt, setEditAtt] = useState(null)
  const qc = useQueryClient()

  const { data: studentData, isLoading: loadStudent } = useQuery({
    queryKey: ['admin', 'student', id],
    queryFn: () => api.get(`/admin/students/${id}`).then(r => r.data.data),
  })
  const student = studentData?.student || studentData

  const { data: academics, isLoading: loadAcademics } = useQuery({
    queryKey: ['admin', 'student', 'academics', id],
    queryFn: () => api.get(`/admin/students/${id}/academics`).then(r => r.data.data),
  })

  const deleteEvMut = useMutation({
    mutationFn: (evId) => api.delete(`/admin/evaluations/${evId}`),
    onSuccess: () => { toast.success('تم حذف التقييم'); qc.invalidateQueries({ queryKey: ['admin', 'student', 'academics'] }) },
    onError: () => toast.error('خطأ في الحذف'),
  })

  if (loadStudent) {
    return <div className="flex justify-center pt-20"><Spinner color="border-brand-purple" /></div>
  }

  if (!student) {
    return <div className="text-center pt-20 text-[#9b7fd6]">الطالب غير موجود</div>
  }

  const sub = studentData?.subscription
  const evalList = academics?.evaluations || []
  const attList = academics?.attendance || []
  const hwList = academics?.homework || []
  const memList = academics?.memorization || []
  const revList = academics?.revision || []

  const avgScore = evalList.length ? (evalList.reduce((a, e) => a + (e.score || 0), 0) / evalList.length).toFixed(1) : null
  const attRate = attList.length ? Math.round((attList.filter(a => a.status === 'present').length / attList.length) * 100) : null
  const hwRate = hwList.length ? Math.round((hwList.filter(h => h.submissions?.some(s => !s.grade)).length === 0 ? hwList.length : hwList.filter(h => h.submissions?.length > 0).length) / hwList.length * 100) : null

  return (
    <div dir="rtl">
      {/* Back nav */}
      <div className="mb-5">
        <Link to={ROUTES.ADMIN_STUDENTS} className="inline-flex items-center gap-1.5 text-sm text-[#9b7fd6] hover:text-brand-purple transition-colors">
          <ArrowRight size={14} />
          الرجوع للطلاب
        </Link>
      </div>

      {/* Hero card */}
      <div className="card-light p-6 mb-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar src={student.avatar} firstName={student.firstNameAr} lastName={student.lastNameAr} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="font-heading font-bold text-2xl text-brand-textBody">{student.firstNameAr} {student.lastNameAr}</h1>
              <Badge variant={student.isActive ? 'success' : 'gray'}>{student.isActive ? 'نشط' : 'موقوف'}</Badge>
            </div>
            <div className="text-sm text-[#9b7fd6] mb-4">{student.email} {student.phone ? `· ${student.phone}` : ''}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'متوسط التقييم', value: avgScore ? `${avgScore}/10` : '—', color: 'text-violet-600' },
                { label: 'نسبة الحضور', value: attRate ? `${attRate}%` : '—', color: attRate >= 80 ? 'text-green-600' : 'text-amber-600' },
                { label: 'الحصص المتبقية', value: sub ? `${sub.sessionsRemaining}` : '—', color: 'text-brand-textBody' },
                { label: 'الباقة', value: sub?.packageId?.nameAr || 'بلا اشتراك', color: 'text-brand-textBody' },
              ].map(s => (
                <div key={s.label} className="bg-[#f8f5ff] rounded-xl p-3">
                  <div className={`font-bold text-xl ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-[#9b7fd6] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <Link to={`${ROUTES.ADMIN_STUDENTS}?edit=${id}`} className="btn-outline text-xs px-3 py-2">
            <Edit2 size={12} className="inline ml-1" /> تعديل الملف
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#f0ecf8] rounded-xl w-fit mb-5">
        {TAB_KEYS.map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-[10px] text-sm font-semibold transition-all ${tab === k ? 'bg-white text-brand-textBody shadow-sm' : 'text-[#9b7fd6] hover:text-brand-textBody'}`}>
            {TAB_LABELS[k]}
          </button>
        ))}
      </div>

      {loadAcademics ? (
        <div className="flex justify-center py-16"><Spinner color="border-brand-purple" /></div>
      ) : (
        <>
          {/* ── Evaluations ── */}
          {tab === 'evaluations' && (
            <div className="card-light overflow-hidden">
              {evalList.length === 0 ? <div className="text-center py-12 text-[#9b7fd6]">لا توجد تقييمات</div> : (
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#f0ecf8]">
                      {['التاريخ', 'المعلم', 'النوع', 'الدرجة', 'ملاحظات', ''].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#9b7fd6]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {evalList.map(ev => (
                      <tr key={ev._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff]">
                        <td className="px-4 py-3 text-sm text-[#9b7fd6]">{formatDateAr(ev.createdAt)}</td>
                        <td className="px-4 py-3 text-sm text-brand-textBody">{ev.teacherId?.firstNameAr} {ev.teacherId?.lastNameAr}</td>
                        <td className="px-4 py-3">
                          <Badge variant="purple">{ev.type === 'monthly' ? 'شهري' : ev.type === 'weekly' ? 'أسبوعي' : ev.type === 'session' ? 'حصة' : 'نهائي'}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-sm font-bold text-amber-600">
                            <Star size={13} fill="currentColor" /> {ev.score ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#9b7fd6] max-w-[180px] truncate">{ev.notesAr || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => setEditEv(ev)} className="p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg"><Edit2 size={12} /></button>
                            <button onClick={() => { if (window.confirm('حذف التقييم؟')) deleteEvMut.mutate(ev._id) }}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Attendance ── */}
          {tab === 'attendance' && (
            <div className="card-light overflow-hidden">
              {attList.length === 0 ? <div className="text-center py-12 text-[#9b7fd6]">لا توجد سجلات حضور</div> : (
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#f0ecf8]">
                      {['التاريخ', 'الحصة', 'الحالة', 'ملاحظات', ''].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#9b7fd6]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attList.map(att => {
                      const cfg = ATT_CFG[att.status] || { label: att.status, badge: 'gray' }
                      return (
                        <tr key={att._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff]">
                          <td className="px-4 py-3 text-sm text-[#9b7fd6]">{formatDateAr(att.createdAt)}</td>
                          <td className="px-4 py-3 text-sm text-brand-textBody">{att.sessionId?.titleAr || '—'}</td>
                          <td className="px-4 py-3"><Badge variant={cfg.badge}>{cfg.label}</Badge></td>
                          <td className="px-4 py-3 text-sm text-[#9b7fd6]">{att.notes || '—'}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => setEditAtt(att)} className="p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg"><Edit2 size={12} /></button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Homework ── */}
          {tab === 'homework' && (
            <div className="card-light overflow-hidden">
              {hwList.length === 0 ? <div className="text-center py-12 text-[#9b7fd6]">لا توجد واجبات</div> : (
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-[#f0ecf8]">
                      {['الواجب', 'الاستحقاق', 'الحالة', 'التسليم'].map(h => (
                        <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-[#9b7fd6]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hwList.map(hw => {
                      const mySub = hw.submissions?.find(s => s.studentId?.toString() === id || s.content)
                      return (
                        <tr key={hw._id} className="border-b border-[#f8f5ff] hover:bg-[#faf9ff]">
                          <td className="px-4 py-3 text-sm font-semibold text-brand-textBody">{hw.titleAr}</td>
                          <td className="px-4 py-3 text-sm text-[#9b7fd6]">{formatDateAr(hw.dueDate)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={hw.status === 'active' ? 'success' : 'gray'}>
                              {hw.status === 'active' ? 'نشط' : 'مكتمل'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {mySub ? (
                              <span className="text-xs text-green-600 font-semibold">
                                سُلِّم {mySub.grade !== undefined ? `· درجة: ${mySub.grade}` : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 font-semibold">لم يُسلَّم</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Memorization ── */}
          {tab === 'memorization' && (
            <div className="space-y-3">
              {memList.length === 0 ? <div className="card-light text-center py-12 text-[#9b7fd6]">لا توجد سجلات حفظ</div>
                : memList.map(m => (
                  <div key={m._id} className="card-light p-4 flex justify-between items-center gap-3">
                    <div>
                      <div className="font-semibold text-brand-textBody">{m.surahName || m.surahNumber}</div>
                      <div className="text-xs text-[#9b7fd6] mt-0.5">
                        {m.ayahFrom && m.ayahTo ? `آية ${m.ayahFrom} – ${m.ayahTo}` : ''}
                        {m.pages ? ` · ${m.pages} صفحة` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {m.grade && <span className="flex items-center gap-1 text-sm font-bold text-amber-600"><Star size={12} fill="currentColor" />{m.grade}</span>}
                      <span className="text-xs text-[#9b7fd6]">{formatDateAr(m.createdAt)}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* ── Revision ── */}
          {tab === 'revision' && (
            <div className="space-y-3">
              {revList.length === 0 ? <div className="card-light text-center py-12 text-[#9b7fd6]">لا توجد سجلات مراجعة</div>
                : revList.map(r => (
                  <div key={r._id} className="card-light p-4 flex justify-between items-center gap-3">
                    <div>
                      <div className="font-semibold text-brand-textBody">{r.surahName || r.surahNumber}</div>
                      <div className="text-xs text-[#9b7fd6] mt-0.5">{r.notes || ''}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.grade && <span className="flex items-center gap-1 text-sm font-bold text-amber-600"><Star size={12} fill="currentColor" />{r.grade}</span>}
                      <span className="text-xs text-[#9b7fd6]">{formatDateAr(r.createdAt)}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {editEv && <EditEvalModal ev={editEv} onClose={() => setEditEv(null)} />}
      {editAtt && <EditAttModal att={editAtt} onClose={() => setEditAtt(null)} />}
    </div>
  )
}
