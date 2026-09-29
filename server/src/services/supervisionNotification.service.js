const User = require('../models/User')
const Settings = require('../models/SupervisionSettings')
const { createNotifications } = require('./notification.service')

async function notifySupervisionChange({ team, actorId, supervisorId, supervisorIds = [], eventId, titleAr, bodyAr }) {
  try {
    const settings = await Settings.findOne({ team }).lean()
    const recipients = settings?.notificationRecipients || ['manager', 'supervisor']
    const clauses = []
    if (recipients.includes('manager')) clauses.push({ supervisionTeam: team, supervisionPosition: 'manager' })
    const assigned = [...new Set([supervisorId, ...supervisorIds].filter(Boolean).map(String))]
    if (recipients.includes('supervisor') && assigned.length) clauses.push({ _id: { $in: assigned }, supervisionTeam: team, supervisionPosition: 'supervisor' })
    if (recipients.includes('admin')) clauses.push({ role: 'admin', $or: [{ isPrimaryAdmin: true }, { permissions: 'supervision.view' }] })
    if (!clauses.length) return
    const users = await User.find({ isActive: true, $or: clauses }).select('_id role supervisionTeam supervisionPosition').lean()
    await createNotifications(users.filter((user) => String(user._id) !== String(actorId)).map((user) => ({
      userId: user._id, type: 'assignment', titleAr, bodyAr,
      actionUrl: user.role === 'admin' ? '/admin/supervision' : `/admin/supervision/${team}${user.supervisionPosition === 'manager' ? '-manager' : ''}`,
      metadata: { dedupeKey: `supervision:${eventId}`, team },
    })))
  } catch (error) {
    console.error('[supervision] تعذر إرسال إشعار التغيير', error)
  }
}

async function notifyAcademicNewTeacher({ teacherId, teacherName, actorId }) {
  try {
    const managers = await User.find({ isActive: true, supervisionTeam: 'academic', supervisionPosition: 'manager' }).select('_id').lean()
    await createNotifications(managers.filter((row) => String(row._id) !== String(actorId)).map((row) => ({
      userId: row._id, type: 'assignment', titleAr: 'معلم جديد جاهز للإسناد',
      bodyAr: `اكتملت رحلة إعداد المعلم ${teacherName || ''}. راجع تكليفه بالحلقات والإشراف.`,
      actionUrl: '/admin/supervision/academic-manager', metadata: { dedupeKey: `academic-new-teacher:${teacherId}` },
    })))
  } catch (error) { console.error('[supervision] تعذر إشعار الأكاديمي بالمعلم الجديد', error) }
}

module.exports = { notifySupervisionChange, notifyAcademicNewTeacher }
