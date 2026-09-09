// Dynamic teaching-subject/curriculum catalog — client twin of
// server/src/services/teachingSubject.service.js. Replaces the old
// hardcoded TEACHER_CATEGORY_OPTIONS array (client/src/utils/teacherProfile.js)
// as the source of truth for every form/filter/label that used to read that
// static list, so an admin-created subject (e.g. "الرياضيات") shows up
// everywhere without a redeploy.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../utils/api.js'

export const TEACHING_SUBJECTS_QUERY_KEY = ['teaching-subjects']
export const ADMIN_TEACHING_SUBJECTS_QUERY_KEY = ['admin', 'teaching-subjects']

// Active-only, public endpoint — the same data every form/filter across the
// app needs. Cached for a while since the catalog changes rarely; every
// mutation below invalidates both this and the admin query immediately.
export function useTeachingSubjects() {
  return useQuery({
    queryKey: TEACHING_SUBJECTS_QUERY_KEY,
    queryFn: () => api.get('/teaching-subjects').then((r) => r.data.data || []),
    staleTime: 5 * 60 * 1000,
  })
}

// Admin management screen — every subject, active and archived.
export function useAdminTeachingSubjects(enabled = true) {
  return useQuery({
    queryKey: ADMIN_TEACHING_SUBJECTS_QUERY_KEY,
    queryFn: () => api.get('/admin/teaching-subjects').then((r) => r.data.data || []),
    enabled,
  })
}

function useInvalidateSubjects() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: TEACHING_SUBJECTS_QUERY_KEY })
    qc.invalidateQueries({ queryKey: ADMIN_TEACHING_SUBJECTS_QUERY_KEY })
  }
}

// Returns { subject, created } — `created` is false when the normalized
// name already existed and the server selected/returned that existing
// subject instead of duplicating it (see teachingSubject.service.js).
export function useCreateTeachingSubject() {
  const invalidate = useInvalidateSubjects()
  return useMutation({
    mutationFn: ({ nameAr, nameEn }) => api.post('/admin/teaching-subjects', { nameAr, nameEn }).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUpdateTeachingSubject() {
  const invalidate = useInvalidateSubjects()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.patch(`/admin/teaching-subjects/${id}`, body).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useArchiveTeachingSubject() {
  const invalidate = useInvalidateSubjects()
  return useMutation({
    mutationFn: (id) => api.patch(`/admin/teaching-subjects/${id}/archive`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useUnarchiveTeachingSubject() {
  const invalidate = useInvalidateSubjects()
  return useMutation({
    mutationFn: (id) => api.patch(`/admin/teaching-subjects/${id}/unarchive`).then((r) => r.data),
    onSuccess: invalidate,
  })
}

export function useReorderTeachingSubjects() {
  const invalidate = useInvalidateSubjects()
  return useMutation({
    mutationFn: (orderedIds) => api.patch('/admin/teaching-subjects/reorder', { orderedIds }).then((r) => r.data),
    onSuccess: invalidate,
  })
}
