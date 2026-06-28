import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Mail, Bell, CircleCheck, FolderOpen, X, MessageCircle, Phone, Inbox } from 'lucide-react'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

const STATUS_LABELS = {
  new:      { label: 'جديدة',    color: '#7c3aed', bg: 'rgba(124,58,237,.12)' },
  read:     { label: 'مقروءة',   color: '#3b82f6', bg: 'rgba(59,130,246,.12)' },
  replied:  { label: 'مُجاب عليها', color: '#22c55e', bg: 'rgba(34,197,94,.12)' },
  archived: { label: 'أرشيف',    color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
}

const PREFERRED_LABELS = {
  email:    'بريد إلكتروني',
  phone:    'هاتف',
  whatsapp: 'واتساب',
}

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.new
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.color}33`, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function MessageModal({ msg, onClose }) {
  const qc = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/website/contact-messages/${id}`, data),
    onSuccess: () => { toast.success('تم التحديث'); qc.invalidateQueries({ queryKey: ['admin', 'contact-messages'] }) },
    onError: () => toast.error('حدث خطأ'),
  })

  if (!msg) return null

  function setStatus(status) {
    updateMutation.mutate({ id: msg._id, data: { status } })
  }

  const formattedDate = new Date(msg.createdAt).toLocaleString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 600, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} dir="rtl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 20, color: '#1A0447', marginBottom: 6 }}>رسالة من {msg.name}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={msg.status} />
              {msg.preferredContact && (
                <span style={{ fontSize: 12, color: '#6b7280', padding: '3px 8px', borderRadius: 20, background: '#f3f4f6' }}>
                  {PREFERRED_LABELS[msg.preferredContact]}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={20} strokeWidth={2} /></button>
        </div>

        {/* Contact Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, padding: 16, background: '#f8f7ff', borderRadius: 12, border: '1px solid #ede9fe' }}>
          <Info label="البريد الإلكتروني" value={<a href={`mailto:${msg.email}`} style={{ color: '#7c3aed', textDecoration: 'none' }}>{msg.email}</a>} />
          {msg.phone && <Info label="الهاتف" value={<a href={`tel:${msg.phone}`} style={{ color: '#7c3aed', textDecoration: 'none' }}>{msg.phone}</a>} />}
          {msg.country && <Info label="الدولة" value={msg.country} />}
          {msg.subject && <Info label="الموضوع" value={msg.subject} />}
          <Info label="التاريخ" value={formattedDate} />
        </div>

        {/* Message */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>الرسالة</label>
          <div style={{ padding: '16px 18px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb', color: '#374151', fontSize: 14.5, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
            {msg.message}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href={`mailto:${msg.email}?subject=رد على رسالتك - ترتيلة أونلاين`}
            onClick={() => setStatus('replied')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', textDecoration: 'none', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13.5 }}>
            <Mail size={14} strokeWidth={2} /> رد بالإيميل
          </a>
          {msg.phone && (
            <a href={`https://api.whatsapp.com/send/?phone=${msg.phone.replace(/[^\d]/g,'')}&text=السلام عليكم ${msg.name}، نشكرك على تواصلك مع ترتيلة أونلاين`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => setStatus('replied')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, background: '#25D366', color: '#fff', textDecoration: 'none', fontFamily: 'Tajawal', fontWeight: 700, fontSize: 13.5 }}>
              <MessageCircle size={14} strokeWidth={2} /> واتساب
            </a>
          )}
          {msg.status !== 'archived' && (
            <button onClick={() => setStatus('archived')} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#6b7280', fontFamily: 'Tajawal', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
              <FolderOpen size={14} strokeWidth={2} /> أرشفة
            </button>
          )}
          {msg.status !== 'read' && msg.status !== 'replied' && (
            <button onClick={() => setStatus('read')} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#7c3aed', fontFamily: 'Tajawal', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>
              <CircleCheck size={14} strokeWidth={2} /> تحديد كمقروء
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: '#374151', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

export default function AdminContactPage() {
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedMsg, setSelectedMsg] = useState(null)
  const qc = useQueryClient()

  const { data: statsData } = useQuery({
    queryKey: ['admin', 'contact-stats'],
    queryFn: () => api.get('/website/contact-messages/stats').then(r => r.data.data),
    placeholderData: { total: 0, new: 0, replied: 0, archived: 0 },
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'contact-messages', { status, search, page }],
    queryFn: () => api.get('/website/contact-messages', { params: { status: status !== 'all' ? status : undefined, search, page, limit: 20 } }).then(r => r.data),
    placeholderData: { data: [], pagination: {} },
  })

  const messages = data?.data || []
  const pagination = data?.pagination || {}
  const stats = statsData || {}

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/website/contact-messages/${id}`),
    onSuccess: () => { toast.success('تم الحذف'); qc.invalidateQueries({ queryKey: ['admin', 'contact-messages'] }); qc.invalidateQueries({ queryKey: ['admin', 'contact-stats'] }) },
    onError: () => toast.error('حدث خطأ'),
  })

  function handleDelete(id, e) {
    e.stopPropagation()
    if (window.confirm('هل تريد حذف هذه الرسالة نهائياً؟')) {
      deleteMutation.mutate(id)
    }
  }

  const TABS = [
    { key: 'all',      label: 'الكل',      count: stats.total },
    { key: 'new',      label: 'جديدة',     count: stats.new, dot: stats.new > 0 },
    { key: 'read',     label: 'مقروءة',    count: undefined },
    { key: 'replied',  label: 'مُجاب عليها', count: stats.replied },
    { key: 'archived', label: 'الأرشيف',   count: stats.archived },
  ]

  return (
    <div dir="rtl">
      <PageHeader title="رسائل التواصل" subtitle="إدارة رسائل الزوار والمهتمين بالأكاديمية" />

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'إجمالي الرسائل', value: stats.total || 0,    Icon: Mail,         color: '#7c3aed' },
          { label: 'رسائل جديدة',    value: stats.new || 0,      Icon: Bell,         color: '#ef4444', pulse: (stats.new || 0) > 0 },
          { label: 'تم الرد',        value: stats.replied || 0,  Icon: CircleCheck,  color: '#22c55e' },
          { label: 'في الأرشيف',     value: stats.archived || 0, Icon: FolderOpen,   color: '#94a3b8' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: `1px solid ${card.color}22`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <card.Icon size={24} strokeWidth={1.8} color={card.color} />
              {card.pulse && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'ping 1.5s ease infinite' }} />}
            </div>
            <div style={{ fontFamily: 'Cairo', fontWeight: 800, fontSize: 28, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 1, background: '#f0ecf8', borderRadius: 12, padding: 4 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setStatus(t.key); setPage(1) }}
              style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s', background: status === t.key ? '#fff' : 'transparent', color: status === t.key ? '#1A0447' : '#9b7fd6', boxShadow: status === t.key ? '0 2px 8px rgba(0,0,0,.08)' : 'none', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Cairo' }}>
              {t.label}
              {t.count !== undefined && (
                <span style={{ fontSize: 11, fontWeight: 800, padding: '1px 7px', borderRadius: 20, background: status === t.key ? '#7c3aed' : '#e9e4f6', color: status === t.key ? '#fff' : '#7c3aed' }}>
                  {t.count}
                </span>
              )}
              {t.dot && status !== t.key && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="بحث في الرسائل..."
          style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, fontFamily: 'Tajawal', minWidth: 220, outline: 'none', direction: 'rtl' }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><Spinner /></div>
        ) : messages.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ marginBottom: 12 }}><Inbox size={48} strokeWidth={1.2} color="#d1d5db" /></div>
            <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 16, color: '#6b7280' }}>لا توجد رسائل</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f7ff', borderBottom: '1px solid #ede9fe' }}>
                {['المُرسِل', 'الموضوع', 'الدولة', 'التواصل', 'الحالة', 'التاريخ', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#7c3aed', fontFamily: 'Cairo', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {messages.map((msg, i) => (
                <tr
                  key={msg._id}
                  onClick={() => setSelectedMsg(msg)}
                  style={{ borderBottom: i < messages.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer', background: msg.status === 'new' ? '#fdf8ff' : '#fff', transition: 'background .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = msg.status === 'new' ? '#fdf8ff' : '#fff' }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {msg.status === 'new' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />}
                      <div>
                        <div style={{ fontFamily: 'Cairo', fontWeight: 700, fontSize: 14, color: '#1A0447' }}>{msg.name}</div>
                        <div style={{ fontSize: 12.5, color: '#6b7280' }}>{msg.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13.5, color: '#374151', maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.subject || msg.message?.slice(0, 60) || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>{msg.country || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>
                    {PREFERRED_LABELS[msg.preferredContact] || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={msg.status} /></td>
                  <td style={{ padding: '14px 16px', fontSize: 12.5, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                    {new Date(msg.createdAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={(e) => handleDelete(msg._id, e)}
                      style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', color: '#ef4444', fontSize: 12.5, cursor: 'pointer', fontFamily: 'Tajawal', fontWeight: 600 }}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${p === page ? '#7c3aed' : '#e5e7eb'}`, background: p === page ? '#7c3aed' : '#fff', color: p === page ? '#fff' : '#374151', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'Cairo' }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {selectedMsg && (
        <MessageModal msg={selectedMsg} onClose={() => setSelectedMsg(null)} />
      )}

      <style>{`
        @keyframes ping { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.5; transform:scale(1.4) } }
      `}</style>
    </div>
  )
}
