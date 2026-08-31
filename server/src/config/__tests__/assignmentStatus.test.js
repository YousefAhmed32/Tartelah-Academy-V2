const { canTransition, assertTransition, InvalidTransitionError, RESERVING_STATUSES, RESERVING_SLOT_SOURCE } = require('../assignmentStatus')

describe('assignmentStatus transitions', () => {
  test('pending_teacher_approval can move to accepted/rejected/time_change_requested/cancelled', () => {
    expect(canTransition('pending_teacher_approval', 'accepted')).toBe(true)
    expect(canTransition('pending_teacher_approval', 'rejected')).toBe(true)
    expect(canTransition('pending_teacher_approval', 'time_change_requested')).toBe(true)
    expect(canTransition('pending_teacher_approval', 'cancelled')).toBe(true)
  })

  test('accepted can only move forward to completed', () => {
    expect(canTransition('accepted', 'completed')).toBe(true)
    expect(canTransition('accepted', 'pending_teacher_approval')).toBe(false)
    expect(canTransition('accepted', 'rejected')).toBe(false)
  })

  test('completed/reassigned/cancelled are terminal', () => {
    expect(canTransition('completed', 'pending_teacher_approval')).toBe(false)
    expect(canTransition('reassigned', 'pending_teacher_approval')).toBe(false)
    expect(canTransition('cancelled', 'pending_teacher_approval')).toBe(false)
  })

  test('rejected/time_change_requested can go back to pending (edit&resend) or to reassigned/cancelled', () => {
    expect(canTransition('rejected', 'pending_teacher_approval')).toBe(true)
    expect(canTransition('rejected', 'reassigned')).toBe(true)
    expect(canTransition('rejected', 'cancelled')).toBe(true)
    expect(canTransition('time_change_requested', 'pending_teacher_approval')).toBe(true)
  })

  test('assertTransition throws InvalidTransitionError for an invalid jump', () => {
    expect(() => assertTransition('completed', 'accepted')).toThrow(InvalidTransitionError)
  })

  test('assertTransition does not throw for a valid jump', () => {
    expect(() => assertTransition('pending_teacher_approval', 'accepted')).not.toThrow()
  })

  // A pending request holds its originally requested slot; a teacher's own
  // proposed alternative (still awaiting an admin decision) holds that
  // proposed slot instead — see availability.service.js's loadBusyByDay.
  test('pending_teacher_approval and time_change_requested both reserve a slot', () => {
    expect(RESERVING_STATUSES).toEqual(['pending_teacher_approval', 'time_change_requested'])
  })

  test('each reserving status maps to the correct slot source', () => {
    expect(RESERVING_SLOT_SOURCE.pending_teacher_approval).toBe('schedule')
    expect(RESERVING_SLOT_SOURCE.time_change_requested).toBe('proposedSchedule')
  })
})
