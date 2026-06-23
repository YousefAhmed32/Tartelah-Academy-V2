import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../utils/api.js'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import Input from '../../components/ui/Input.jsx'
import EmptyState from '../../components/shared/EmptyState.jsx'

export default function TeacherStudentsPage() {
  const [search, setSearch] = useState('')

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/teachers/me/students').then(r => r.data.data),
  })

  const filtered = students.filter(s =>
    `${s.firstNameAr} ${s.lastNameAr} ${s.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="طلابي" subtitle={`${students.length} طالب مسجل`} />

      <div className="mb-4 max-w-sm">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث عن طالب..."
          className="field w-full"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner color="border-brand-gold" /></div>
      ) : !filtered.length ? (
        <EmptyState
          icon={<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.7"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.7"/></svg>}
          title="لا يوجد طلاب"
          description={search ? 'لا توجد نتائج مطابقة للبحث' : 'لم يتم تعيين طلاب بعد'}
          dark
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((st) => (
            <div key={st._id} className="rounded-card p-5 flex items-start gap-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Avatar src={st.avatar} name={`${st.firstNameAr} ${st.lastNameAr}`} size="md" ring />
              <div className="flex-1 min-w-0">
                <div className="font-heading font-bold text-white truncate">{st.firstNameAr} {st.lastNameAr}</div>
                <div className="text-xs mt-0.5 truncate" style={{ color: '#b3a4d0' }}>{st.email}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="purple">{st.courseLevel || 'مبتدئ'}</Badge>
                  <span className="text-xs" style={{ color: '#b3a4d0' }}>حضور: {st.attendanceRate || 0}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
