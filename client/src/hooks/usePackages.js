import { useQuery } from '@tanstack/react-query'
import api from '../utils/api.js'
import { QK } from '../services/queryKeys.js'

/**
 * The single source of truth for reading packages anywhere in the app.
 * Every public surface (Pricing page, HomePage, student enrollment) and the
 * Admin package list should go through this hook instead of calling
 * `api.get('/packages')` independently — that way there's exactly one query
 * key shape, one response-envelope assumption, and one cache to invalidate
 * when the admin creates/edits/toggles/duplicates a package.
 *
 * activeOnly: true  -> GET /packages          (public, isActive-only, admin-safe fields only)
 * activeOnly: false -> GET /packages/admin/all (admin-only, every package incl. inactive)
 */
export function usePackages({ activeOnly = true } = {}) {
  const query = useQuery({
    queryKey: [...QK.PACKAGES, { activeOnly }],
    queryFn: () =>
      api
        .get(activeOnly ? '/packages' : '/packages/admin/all')
        .then((r) => r.data.data ?? []),
    staleTime: 60_000,
  })

  return {
    packages: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
