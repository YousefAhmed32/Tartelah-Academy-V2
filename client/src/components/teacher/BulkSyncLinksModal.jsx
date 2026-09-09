import { useState, useId, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Video, Link2, Check, CheckSquare, Square, AlertCircle,
  ExternalLink, RefreshCw, Users, Sparkles, Search, MonitorPlay,
  Briefcase, Globe,
} from 'lucide-react'
import api from '../../utils/api.js'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import Avatar from '../ui/Avatar.jsx'
import Spinner from '../ui/Spinner.jsx'
import { getFileUrl, MEETING_PROVIDERS } from '../../config/constants.js'

function detectProvider(url) {
  if (!url || typeof url !== 'string') return 'zoom'
  const lower = url.toLowerCase().trim()
  if (lower.includes('meet.google.com')) return 'meet'
  if (lower.includes('zoom.us') || lower.includes('zoom.com')) return 'zoom'
  if (lower.includes('teams.microsoft.com') || lower.includes('teams.live.com')) return 'teams'
  return 'other'
}

const PROVIDER_CARDS = [
  {
    key: 'meet',
    label: 'Google Meet',
    desc: 'موصى به لحصص جوجل',
    color: '#00897B',
    bgLight: 'rgba(0,137,123,0.08)',
    borderActive: '#00897B',
    Icon: MonitorPlay,
    placeholder: 'https://meet.google.com/xxx-xxxx-xxx',
  },
  {
    key: 'zoom',
    label: 'Zoom',
    desc: 'روابط غرف زووم',
    color: '#2D8CFF',
    bgLight: 'rgba(45,140,255,0.08)',
    borderActive: '#2D8CFF',
    Icon: Video,
    placeholder: 'https://zoom.us/j/xxxxxxxxxx',
  },
  {
    key: 'teams',
    label: 'Microsoft Teams',
    desc: 'فصول مايكروسوفت',
    color: '#6264A7',
    bgLight: 'rgba(98,100,167,0.08)',
    borderActive: '#6264A7',
    Icon: Briefcase,
    placeholder: 'https://teams.microsoft.com/l/meetup-join/...',
  },
  {
    key: 'other',
    label: 'رابط آخر / مخصص',
    desc: 'أي منصة أخرى',
    color: '#7c3aed',
    bgLight: 'rgba(124,58,237,0.08)',
    borderActive: '#7c3aed',
    Icon: Globe,
    placeholder: 'https://...',
  },
]

export default function BulkSyncLinksModal({
  open,
  onClose,
  teacherId,
  isAdmin = false,
  initialLink = '',
  savedLinks = [],
  preloadedStudents = null,
}) {
  const qc = useQueryClient()
  const linkInputId = useId()
  const [meetingLink, setMeetingLink] = useState(initialLink)
  const [meetingProvider, setMeetingProvider] = useState(() => detectProvider(initialLink))
  const [saveToSavedLinks, setSaveToSavedLinks] = useState(true)
  const [scopeMode, setScopeMode] = useState('all') // 'all' | 'custom'
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [studentSearch, setStudentSearch] = useState('')

  // Fetch teacher saved links if not passed
  const { data: fetchedLinks = [] } = useQuery({
    queryKey: isAdmin ? ['admin', 'teachers', teacherId, 'links'] : ['teacher', 'links'],
    queryFn: () => {
      if (isAdmin && teacherId) {
        return api.get(`/admin/teachers/${teacherId}`).then((r) => r.data.data?.teacher?.meetingLinks || [])
      }
      return api.get('/teachers/me/links').then((r) => r.data.data || [])
    },
    enabled: open && (!savedLinks || savedLinks.length === 0),
  })
  const availableSavedLinks = (savedLinks && savedLinks.length > 0) ? savedLinks : fetchedLinks

  // Fetch students if not preloaded
  const { data: fetchedStudents = [], isLoading: loadingStudents } = useQuery({
    queryKey: isAdmin ? ['admin', 'teachers', teacherId, 'students-for-sync'] : ['teacher', 'students'],
    queryFn: () => {
      if (isAdmin && teacherId) {
        return api.get(`/admin/teachers/${teacherId}`).then((r) => r.data.data?.students || [])
      }
      return api.get('/teachers/me/students').then((r) => r.data.data || [])
    },
    enabled: open && !preloadedStudents,
  })

  const studentList = useMemo(() => {
    return (preloadedStudents || fetchedStudents).map((s) => {
      const studentObj = s.student || s
      return {
        _id: studentObj._id || s._id,
        firstNameAr: studentObj.firstNameAr,
        lastNameAr: studentObj.lastNameAr,
        avatar: studentObj.avatar,
        packageName: s.package?.nameAr || studentObj.packageName || '',
      }
    })
  }, [preloadedStudents, fetchedStudents])

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentList
    const term = studentSearch.trim().toLowerCase()
    return studentList.filter((s) => {
      const fullName = `${s.firstNameAr || ''} ${s.lastNameAr || ''}`.toLowerCase()
      return fullName.includes(term)
    })
  }, [studentList, studentSearch])

  // Auto-detect provider when typing URL
  function handleLinkChange(val) {
    setMeetingLink(val)
    if (val.trim()) {
      setMeetingProvider(detectProvider(val))
    }
  }

  function handleSelectProvider(provKey) {
    setMeetingProvider(provKey)
  }

  function handleSelectSaved(linkObj) {
    if (!linkObj) return
    setMeetingLink(linkObj.link)
    setMeetingProvider(linkObj.provider || detectProvider(linkObj.link))
  }

  function toggleStudent(id) {
    setSelectedStudentIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  function handleSelectAllStudents() {
    setSelectedStudentIds(studentList.map((s) => s._id))
  }

  function handleDeselectAllStudents() {
    setSelectedStudentIds([])
  }

  const effectiveSelectedCount = scopeMode === 'all' ? studentList.length : selectedStudentIds.length

  const isValidUrl = meetingLink.trim().startsWith('http://') || meetingLink.trim().startsWith('https://')

  const syncMutation = useMutation({
    mutationFn: () => {
      if (!isValidUrl) {
        throw new Error('يرجى إدخال رابط يبدأ بـ https:// أو http://')
      }
      if (scopeMode === 'custom' && selectedStudentIds.length === 0) {
        throw new Error('يرجى تحديد طالب واحد على الأقل أو اختيار التعميم على الجميع')
      }

      const endpoint = isAdmin
        ? `/admin/teachers/${teacherId}/sync-meeting-links`
        : '/teachers/me/sync-meeting-links'

      return api.post(endpoint, {
        meetingLink: meetingLink.trim(),
        meetingProvider,
        studentIds: scopeMode === 'all' ? [] : selectedStudentIds,
        saveToSavedLinks,
      })
    },
    onSuccess: (res) => {
      const { updatedRulesCount = 0, updatedSessionsCount = 0, affectedStudentsCount = 0 } = res.data?.data || {}
      toast.success(
        `تم بنجاح تحديث وتعميم الرابط على ${affectedStudentsCount} طالب (${updatedRulesCount} جدول دوري و ${updatedSessionsCount} حصة قادمة)`,
        { duration: 5000 }
      )
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'links'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'students'] })
      qc.invalidateQueries({ queryKey: ['teacher', 'schedule-rules'] })
      qc.invalidateQueries({ queryKey: ['admin', 'teacher-profile'] })
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      onClose()
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'حدث خطأ أثناء تحديث وتعميم الرابط')
    },
  })

  const currentProviderMeta = PROVIDER_CARDS.find((p) => p.key === meetingProvider) || PROVIDER_CARDS[0]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تجديد وتعميم رابط المحاضرات العام"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full flex-wrap gap-2" dir="rtl">
          <div className="text-xs text-gray-500 font-medium">
            {scopeMode === 'all' ? (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">
                سيشمل جميع طلابك ({studentList.length} طالب)
              </span>
            ) : (
              <span className="text-violet-700 font-bold bg-violet-50 px-2.5 py-1 rounded-lg">
                سيشمل {selectedStudentIds.length} من {studentList.length} طالب
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="!bg-gray-100 !text-gray-700 hover:!bg-gray-200 !border-transparent"
              onClick={onClose}
              disabled={syncMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              variant="purple"
              onClick={() => syncMutation.mutate()}
              loading={syncMutation.isPending}
              disabled={!isValidUrl || (scopeMode === 'custom' && selectedStudentIds.length === 0)}
              className="flex items-center gap-2 !px-5"
            >
              <RefreshCw size={15} />
              تحديث وتعميم الرابط الآن
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-start" dir="rtl">
        {/* Top Explanatory Banner */}
        <div className="rounded-2xl p-4 bg-gradient-to-l from-violet-50/80 to-indigo-50/50 border border-violet-100/80 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center flex-none shadow-sm shadow-violet-200">
            <Video size={20} />
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <h4 className="font-bold text-gray-900 text-sm mb-0.5">
              تغيير الرابط العمومي وتحديث جداول الطلاب
            </h4>
            <p className="text-gray-600 leading-relaxed">
              إذا تغير رابط Zoom أو Google Meet الخاص بك، يمكنك وضع الرابط الجديد هنا وسيقوم النظام تلقائياً بتحديث جميع الجداول الدورية والحصص القادمة للطلاب، مع إشعارهم فوراً.
            </p>
          </div>
        </div>

        {/* Platform Selection Cards */}
        <div>
          <label className="text-xs font-bold text-gray-800 block mb-2">
            1. اختر المنصة التي تستخدمها:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PROVIDER_CARDS.map((prov) => {
              const isSelected = meetingProvider === prov.key
              return (
                <button
                  key={prov.key}
                  type="button"
                  onClick={() => handleSelectProvider(prov.key)}
                  className={`p-3 rounded-2xl border-2 text-start transition-all flex flex-col justify-between gap-2 relative ${
                    isSelected
                      ? 'border-violet-600 bg-violet-50/40 shadow-sm ring-2 ring-violet-200'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: prov.bgLight }}
                    >
                      <prov.Icon size={18} color={prov.color} />
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-gray-900">{prov.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{prov.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick Pick from Saved Links if available */}
        {availableSavedLinks.length > 0 && (
          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <Sparkles size={13} className="text-amber-500" />
              أو اختر من روابطك السابقة المحفوظة:
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSavedLinks.map((sl, idx) => {
                const prov = MEETING_PROVIDERS[sl.provider] || MEETING_PROVIDERS.zoom
                const isCurrent = meetingLink.trim() === sl.link?.trim()
                return (
                  <button
                    key={sl._id || idx}
                    type="button"
                    onClick={() => handleSelectSaved(sl)}
                    className={`text-xs py-1.5 px-3 rounded-xl font-medium border flex items-center gap-1.5 transition-all ${
                      isCurrent
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: isCurrent ? '#fff' : prov?.color || '#7c3aed' }} />
                    <span>{sl.label || prov?.label || 'رابط سابق'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Meeting Link Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor={linkInputId} className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Link2 size={14} className="text-violet-600" />
              2. رابط الاجتماع الجديد *
            </label>
            {isValidUrl && (
              <a
                href={meetingLink.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 transition-colors"
              >
                <ExternalLink size={12} /> اختبار الرابط في نافذة جديدة
              </a>
            )}
          </div>
          <div className="relative">
            <input
              id={linkInputId}
              type="url"
              dir="ltr"
              value={meetingLink}
              onChange={(e) => handleLinkChange(e.target.value)}
              placeholder={currentProviderMeta.placeholder}
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-2xl ps-4 pe-28 text-xs sm:text-sm text-gray-900 outline-none focus:border-violet-600 focus:ring-4 focus:ring-violet-100 focus:bg-white transition-all font-mono"
            />
            <div className="absolute end-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-white border border-gray-100 shadow-sm py-1 px-2.5 rounded-xl text-[11px] font-bold text-gray-700">
              <span className="w-2 h-2 rounded-full" style={{ background: currentProviderMeta.color }} />
              <span>{currentProviderMeta.label}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <p className="text-[11px] text-gray-400">
              {isValidUrl ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  ✓ صيغة الرابط صحيحة وجاهزة للتعميم
                </span>
              ) : (
                'مثال: meet.google.com/xxx-xxxx-xxx أو zoom.us/j/xxxxxxxxxx'
              )}
            </p>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700 select-none">
              <input
                type="checkbox"
                checked={saveToSavedLinks}
                onChange={(e) => setSaveToSavedLinks(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
              />
              حفظ كرابط دائم في الحساب
            </label>
          </div>
        </div>

        {/* Scope of Update (All vs Custom Selection) */}
        <div className="pt-2 border-t border-gray-100">
          <label className="text-xs font-bold text-gray-800 block mb-2 flex items-center gap-1.5">
            <Users size={14} className="text-violet-600" />
            3. حدد نطاق تعميم الرابط:
          </label>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              type="button"
              onClick={() => setScopeMode('all')}
              className={`p-3 rounded-2xl border-2 text-start transition-all ${
                scopeMode === 'all'
                  ? 'border-violet-600 bg-violet-50/50 shadow-sm ring-2 ring-violet-200'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-gray-900">تعميم على جميع الطلاب</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  scopeMode === 'all' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  الكل ({studentList.length})
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                تحديث جداول وحصص كل الطلاب المسندين لك بالرابط الجديد.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setScopeMode('custom')
                if (selectedStudentIds.length === 0) {
                  setSelectedStudentIds(studentList.map((s) => s._id))
                }
              }}
              className={`p-3 rounded-2xl border-2 text-start transition-all ${
                scopeMode === 'custom'
                  ? 'border-violet-600 bg-violet-50/50 shadow-sm ring-2 ring-violet-200'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-gray-900">تخصيص طلاب محددين</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  scopeMode === 'custom' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  مخصص ({selectedStudentIds.length})
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                اختر طالباً أو طالبين لتحديث رابطهما وترك باقي الطلاب كما هم.
              </p>
            </button>
          </div>

          {/* Student Custom Checklist */}
          {scopeMode === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl border border-gray-200 p-3.5 bg-gray-50/50 space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="بحث عن طالب بالاسم..."
                    className="w-full h-9 bg-white border border-gray-200 rounded-xl ps-8 pe-3 text-xs outline-none focus:border-violet-500"
                  />
                  <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllStudents}
                    className="text-[11px] font-bold text-violet-600 hover:text-violet-800"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllStudents}
                    className="text-[11px] font-bold text-gray-500 hover:text-gray-700"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              {loadingStudents ? (
                <div className="flex justify-center py-6">
                  <Spinner size="sm" color="border-violet-600" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">
                  لا توجد نتائج تطابق بحثك
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-1.5 pe-1 custom-scroll">
                  {filteredStudents.map((st) => {
                    const isSelected = selectedStudentIds.includes(st._id)
                    const fullName = `${st.firstNameAr || ''} ${st.lastNameAr || ''}`.trim() || 'طالب'
                    return (
                      <div
                        key={st._id}
                        onClick={() => toggleStudent(st._id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white border-violet-300 shadow-xs'
                            : 'bg-white/60 border-gray-100 hover:bg-white text-gray-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="text-violet-600 flex-none">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-violet-600" />
                            ) : (
                              <Square size={16} className="text-gray-300" />
                            )}
                          </div>
                          <Avatar
                            src={getFileUrl(st.avatar)}
                            firstName={st.firstNameAr}
                            lastName={st.lastNameAr}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <div className={`font-bold text-xs truncate ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                              {fullName}
                            </div>
                            {st.packageName && (
                              <div className="text-[10px] text-gray-400 truncate">
                                {st.packageName}
                              </div>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full flex-none">
                            محدد لتحديث الرابط
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </Modal>
  )
}
