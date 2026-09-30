import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../authStore.js'
import { queryClient } from '../../config/queryClient.js'

beforeEach(() => useAuthStore.getState().logout())

describe('private query data between accounts', () => {
  it('clears cached data when the signed-in account changes', () => {
    useAuthStore.getState().setAuth({ _id: 'manager' }, 'token')
    queryClient.setQueryData(['supervision', 'exceptions'], ['manager-only'])
    useAuthStore.getState().setAuth({ _id: 'supervisor' }, 'other-token')
    expect(queryClient.getQueryData(['supervision', 'exceptions'])).toBeUndefined()
  })

  it('keeps current account data during token renewal and clears it on logout', () => {
    useAuthStore.getState().setAuth({ _id: 'supervisor' }, 'token')
    queryClient.setQueryData(['supervision', 'reports'], ['own-report'])
    useAuthStore.getState().setAuth({ _id: 'supervisor' }, 'renewed-token')
    expect(queryClient.getQueryData(['supervision', 'reports'])).toEqual(['own-report'])
    useAuthStore.getState().logout()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })
})
