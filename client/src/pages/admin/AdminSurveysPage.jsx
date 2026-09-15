import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ClipboardCheck,
  Search,
  X,
  Phone,
  Filter,
  RefreshCw,
  Star,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  User,
  GraduationCap,
} from 'lucide-react'
import PageHeader from '../../components/shared/PageHeader.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import Avatar from '../../components/ui/Avatar.jsx'
import AdminSurveyDetailDrawer from '../../components/admin/AdminSurveyDetailDrawer.jsx'
import { formatDateAr } from '../../utils/date.js'
import { surveyService } from '../../services/survey.service.js'
import api from '../../utils/api.js'

const RENEWAL_LABELS = {
  yes: { label: 'ينوي التجديد', variant: 'success', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  no: { label: 'لا ينوي التجديد', variant: 'danger', color: 'text-red-700 bg-red-50 border-red-200' },
  undecided: { label: 'لم يقرر بعد', variant: 'warning', color: 'text-amber-700 bg-amber-50 border-amber-200' },
}

export default function AdminSurveysPage() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const surveyIdFromUrl = searchParams.get('id')

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all') // 'all' | 'needs_follow_up' | 'teacher_change' | 'admin_contact'
  const [renewalFilter, setRenewalFilter] = useState('all') // 'all' | 'yes' | 'no' | 'undecided'
  const [selectedTeacherId, setSelectedTeacherId] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedSurvey, setSelectedSurvey] = useState(null)

  // Teachers for selector
  const { data: teachers = [] } = useQuery({
    queryKey: ['admin', 'teachers', 'picker'],
    queryFn: () => api.get('/admin/teachers', { params: { limit: 100 } }).then((r) => r.data.data?.teachers || []),
  })

  // Aggregate stats
  const { data: aggregate, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'surveys', 'aggregate', selectedTeacherId],
    queryFn: () =>
      surveyService
        .getAggregate({
          teacherId: selectedTeacherId !== 'all' ? selectedTeacherId : undefined,
        })
        .then((r) => r.data.data),
  })

  // Surveys list
  const queryParams = {
    status: 'completed',
    page,
    limit: 20,
    search: search.trim() || undefined,
    teacherId: selectedTeacherId !== 'all' ? selectedTeacherId : undefined,
    renewalIntention: renewalFilter !== 'all' ? renewalFilter : undefined,
    requestAdminContact:
      filterType === 'admin_contact' ? true : filterType === 'needs_follow_up' ? true : undefined,
    requestTeacherChange: filterType === 'teacher_change' ? true : undefined,
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'surveys', queryParams],
    queryFn: () => surveyService.getAll(queryParams).then((r) => r.data.data),
  })

  // Deep-link fetch if ?id= is in URL
  const { data: deepLinkedSurvey } = useQuery({
    queryKey: ['admin', 'survey', surveyIdFromUrl],
    queryFn: () => surveyService.getById(surveyIdFromUrl).then((r) => r.data.data),
    enabled: !!surveyIdFromUrl && !selectedSurvey,
  })

  useEffect(() => {
    if (deepLinkedSurvey && !selectedSurvey) {
      setSelectedSurvey(deepLinkedSurvey)
    }
  }, [deepLinkedSurvey, selectedSurvey])

  const followUpMut = useMutation({
    mutationFn: (id) => surveyService.markFollowedUp(id),
    onSuccess: (res) => {
      toast.success('تم تسجيل المتابعة والتواصل بنجاح')
      qc.invalidateQueries({ queryKey: ['admin', 'surveys'] })
      if (selectedSurvey && selectedSurvey._id === res.data.data._id) {
        setSelectedSurvey(res.data.data)
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'حدث خطأ أثناء تسجيل المتابعة'),
  })

  const handleOpenSurvey = (survey) => {
    setSelectedSurvey(survey)
    const next = new URLSearchParams(searchParams)
    next.set('id', survey._id)
    setSearchParams(next, { replace: true })
  }

  const handleCloseDrawer = () => {
    setSelectedSurvey(null)
    if (searchParams.get('id')) {
      const next = new URLSearchParams(searchParams)
      next.delete('id')
      setSearchParams(next, { replace: true })
    }
  }

  const surveys = data?.surveys || []
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }
  const avg = (n) => (n !== undefined && n !== null ? Number(n).toFixed(1) : '—')

  // Calculate overall platform average
  const criteriaKeys = [
    aggregate?.avgTeacherCommitment,
    aggregate?.avgAcademyFollowUp,
    aggregate?.avgReportQuality,
    aggregate?.avgStudentProgress,
    aggregate?.avgRecommendLikelihood,
  ].filter((v) => typeof v === 'number' && v > 0)
  const overallPlatformAvg =
    criteriaKeys.length > 0 ? (criteriaKeys.reduce((a, b) => a + b, 0) / criteriaKeys.length).toFixed(1) : '—'

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <PageHeader
        title="استبيانات التقييم والتجديد"
        subtitle="نتائج استبيانات الطلاب وملاحظاتهم ونوايا التجديد قبل نهاية كل اشتراك"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => {
              refetch()
              refetchStats()
            }}
          >
            تحديث
          </Button>
        }
      />

      {/* ── Top Metric Cards (Apple/Linear light SaaS formula) ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Total Surveys */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between">
          <div className="text-xs text-slate-500 font-semibold mb-1">إجمالي الاستبيانات</div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {aggregate?.count || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">استبيان مكتمل</div>
        </div>

        {/* Intend to Renew */}
        <div
          onClick={() => setRenewalFilter(renewalFilter === 'yes' ? 'all' : 'yes')}
          className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col justify-between cursor-pointer transition-all ${
            renewalFilter === 'yes'
              ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20'
              : 'border-slate-200/90 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>ينوون التجديد</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {aggregate?.renewYes || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {aggregate?.count ? `${Math.round(((aggregate.renewYes || 0) / aggregate.count) * 100)}% من الإجمالي` : '—'}
          </div>
        </div>

        {/* Do NOT Intend to Renew */}
        <div
          onClick={() => setRenewalFilter(renewalFilter === 'no' ? 'all' : 'no')}
          className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col justify-between cursor-pointer transition-all ${
            renewalFilter === 'no'
              ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
              : 'border-slate-200/90 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>لا ينوون التجديد</span>
            <AlertTriangle size={15} className="text-red-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-600">
            {aggregate?.renewNo || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">بحاجة تواصل واستبقاء</div>
        </div>

        {/* Undecided */}
        <div
          onClick={() => setRenewalFilter(renewalFilter === 'undecided' ? 'all' : 'undecided')}
          className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col justify-between cursor-pointer transition-all ${
            renewalFilter === 'undecided'
              ? 'border-amber-500 ring-2 ring-amber-100 bg-amber-50/20'
              : 'border-slate-200/90 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>لم يقرروا بعد</span>
            <HelpCircle size={15} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600">
            {aggregate?.renewUndecided || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">فرصة تحويل ومتابعة</div>
        </div>

        {/* Overall Platform Average */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>المعدل العام</span>
            <Star size={15} className="text-amber-500 fill-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {overallPlatformAvg} <span className="text-sm font-normal text-slate-400">/ 5</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">متوسط الـ 5 معايير</div>
        </div>
      </div>

      {/* ── Criteria Ratings Breakdown Row ── */}
      {aggregate?.count > 0 && (
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
          <div className="text-xs font-bold text-slate-600 px-1">
            متوسط درجات تقييم الأكاديمية (1 - 5 نجوم):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {[
              { label: 'التزام المعلم بالحضور', value: aggregate.avgTeacherCommitment },
              { label: 'متابعة واهتمام الإدارة', value: aggregate.avgAcademyFollowUp },
              { label: 'جودة التقارير الدورية', value: aggregate.avgReportQuality },
              { label: 'تقدّم واستفادة الطالب', value: aggregate.avgStudentProgress },
              { label: 'ترشيح الأكاديمية للغير', value: aggregate.avgRecommendLikelihood },
            ].map((crit, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-xs flex flex-col justify-between"
              >
                <div className="text-[11px] text-slate-500 truncate mb-1">{crit.label}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold font-mono text-slate-900">
                    {avg(crit.value)} <span className="text-[10px] text-slate-400 font-normal">/ 5</span>
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-400">
                    <Star size={12} className="fill-amber-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search and Filter Toolbar ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search box */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="بحث باسم الطالب، المعلم، أو نص الملاحظات..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full h-10 pe-10 ps-8 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-brand-purple focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Teacher Selector Filter */}
          <div className="w-full md:w-56">
            <select
              value={selectedTeacherId}
              onChange={(e) => {
                setSelectedTeacherId(e.target.value)
                setPage(1)
              }}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 outline-none focus:border-brand-purple focus:bg-white transition-all"
            >
              <option value="all">جميع المعلمين</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.firstNameAr || t.firstName} {t.lastNameAr || t.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Renewal Intention Dropdown */}
          <div className="w-full md:w-48">
            <select
              value={renewalFilter}
              onChange={(e) => {
                setRenewalFilter(e.target.value)
                setPage(1)
              }}
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 outline-none focus:border-brand-purple focus:bg-white transition-all"
            >
              <option value="all">جميع نوايا التجديد</option>
              <option value="yes">ينوي التجديد</option>
              <option value="no">لا ينوي التجديد</option>
              <option value="undecided">لم يقرر بعد</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 border-t border-slate-100 text-xs">
          <button
            onClick={() => {
              setFilterType('all')
              setPage(1)
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              filterType === 'all'
                ? 'bg-brand-purple text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            جميع الاستبيانات
          </button>

          <button
            onClick={() => {
              setFilterType('needs_follow_up')
              setPage(1)
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              filterType === 'needs_follow_up'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            <Phone size={13} />
            <span>يحتاج متابعة وتواصل</span>
            {aggregate?.needsFollowUpCount ? (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  filterType === 'needs_follow_up' ? 'bg-white text-red-700' : 'bg-red-600 text-white'
                }`}
              >
                {aggregate.needsFollowUpCount}
              </span>
            ) : null}
          </button>

          <button
            onClick={() => {
              setFilterType('teacher_change')
              setPage(1)
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              filterType === 'teacher_change'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <UserCheck size={13} />
            <span>طلبات تغيير المعلم</span>
          </button>

          <button
            onClick={() => {
              setFilterType('admin_contact')
              setPage(1)
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              filterType === 'admin_contact'
                ? 'bg-brand-purple text-white shadow-xs'
                : 'bg-purple-50 text-brand-purple hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Phone size={13} />
            <span>طلب تواصل الإدارة</span>
          </button>
        </div>
      </div>

      {/* ── Surveys List ── */}
      {isLoading ? (
        <div className="flex justify-center py-24 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
          <Spinner color="border-brand-purple" />
        </div>
      ) : !surveys.length ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-16 text-center">
          <ClipboardCheck size={48} strokeWidth={1.2} className="text-slate-300 mb-3 mx-auto" />
          <h3 className="font-heading font-bold text-slate-800 text-base mb-1">
            لا توجد استبيانات مطابقة
          </h3>
          <p className="text-slate-400 text-xs">
            جرب تغيير معايير البحث أو الفلاتر لعرض استبيانات أخرى.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {surveys.map((s) => {
            const student = s.studentId
            const teacher = s.teacherId
            const studentName = student
              ? `${student.firstNameAr || student.firstName || ''} ${student.lastNameAr || student.lastName || ''}`.trim()
              : 'طالب'
            const teacherName = teacher
              ? `${teacher.firstNameAr || teacher.firstName || ''} ${teacher.lastNameAr || teacher.lastName || ''}`.trim()
              : 'معلم'

            // Quick average of criteria for row
            const rowScores = [
              s.teacherCommitmentRating ?? s.teacherCommitment,
              s.academyFollowUpRating ?? s.academyFollowUp,
              s.reportQualityRating ?? s.reportQuality,
              s.studentProgressRating ?? s.studentProgress,
              s.recommendLikelihood,
            ].filter((v) => typeof v === 'number' && !isNaN(v) && v > 0)
            const rowAvg =
              rowScores.length > 0
                ? (rowScores.reduce((a, b) => a + b, 0) / rowScores.length).toFixed(1)
                : null


            return (
              <div
                key={s._id}
                onClick={() => handleOpenSurvey(s)}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-brand-purple/40 hover:bg-purple-50/10 transition-all p-4 cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Student & Teacher Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      firstName={student?.firstNameAr || student?.firstName}
                      lastName={student?.lastNameAr || student?.lastName}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-sm text-slate-900 group-hover:text-brand-purple transition-colors truncate">
                          {studentName}
                        </span>
                        {rowAvg && (
                          <span className="text-[11px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Star size={10} className="fill-amber-500" />
                            {rowAvg}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 truncate">
                        <span className="flex items-center gap-1">
                          <GraduationCap size={13} className="text-slate-400" />
                          <span>{teacherName}</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400 text-[11px]">
                          {formatDateAr(s.completedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {s.renewalIntention && (
                      <Badge variant={RENEWAL_LABELS[s.renewalIntention]?.variant}>
                        {RENEWAL_LABELS[s.renewalIntention]?.label}
                      </Badge>
                    )}

                    {s.requestTeacherChange && (
                      <Badge variant="warning">طلب تغيير معلم</Badge>
                    )}

                    {s.requestAdminContact && (
                      <Badge variant="danger">طلب تواصل</Badge>
                    )}

                    {s.followedUpAt ? (
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        تمت المتابعة
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                        بانتظار متابعة
                      </span>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs hidden sm:inline-flex group-hover:border-brand-purple group-hover:text-brand-purple"
                    >
                      التفاصيل
                    </Button>
                  </div>
                </div>

                {/* Notes Snippet */}
                {s.notes && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
                    <MessageSquare size={13} className="text-brand-purple flex-none mt-0.5" />
                    <span className="line-clamp-1 italic">"{s.notes}"</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            صفحة <span className="font-bold font-mono">{pagination.page}</span> من{' '}
            <span className="font-bold font-mono">{pagination.pages}</span> (إجمالي{' '}
            <span className="font-bold font-mono">{pagination.total}</span> استبيان)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronRight size={14} className="me-1" />
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
              <ChevronLeft size={14} className="ms-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Slide-Over Detail Drawer ── */}
      <AdminSurveyDetailDrawer
        survey={selectedSurvey}
        open={!!selectedSurvey}
        onClose={handleCloseDrawer}
        onMarkFollowedUp={(id) => followUpMut.mutate(id)}
        isMarkingFollowUp={followUpMut.isPending}
      />
    </div>
  )
}

