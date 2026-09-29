const Assignment = require('../models/SupervisionAssignment')
const Shift = require('../models/SupervisionShift')

async function hasFutureWork(personId) {
  const now = new Date()
  return !!(await Assignment.exists({ supervisorId: personId, $or: [{ endsAt: null }, { endsAt: { $gt: now } }] }) ||
    await Shift.exists({ members: personId, cancelledAt: null, endsAt: { $gt: now } }))
}

module.exports = { hasFutureWork }
