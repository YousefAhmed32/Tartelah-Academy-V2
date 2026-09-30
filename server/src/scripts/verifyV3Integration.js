/* eslint-disable no-console */
// Run manually against a local MongoDB. Every run owns and drops only its new QA database.
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const express = require('express')
const mongoose = require('mongoose')
const { formatInTimeZone } = require('date-fns-tz')

const uri = process.env.V3_QA_MONGO_URI || 'mongodb://127.0.0.1:27017'
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(uri)) {
  throw new Error('V3 QA requires local MongoDB only')
}
const dbName = `tartelah_v3_qa_${crypto.randomBytes(6).toString('hex')}`
process.env.JWT_ACCESS_SECRET = crypto.randomBytes(32).toString('hex')
const User = require('../models/User')
const Session = require('../models/Session')
const ScheduleRule = require('../models/ScheduleRule')
const Assignment = require('../models/SupervisionAssignment')
const Observation = require('../models/AcademicObservationReport')
const Notification = require('../models/Notification')
const { runSessionReminders } = require('../jobs/sessionReminder.job')
const { signAccessToken } = require('../config/jwt')
const route = require('../routes/supervision.routes')

async function main() {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 })
  await Notification.init()
  const app = express()
  app.use(express.json())
  app.use('/api/v1/supervision', route)
  app.use((error, req, res, next) => {
    console.error('QA route error:', error.stack || error.message)
    res.status(500).json({ success: false, message: error.message })
  })
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)) })
  const origin = `http://127.0.0.1:${server.address().port}/api/v1/supervision`
  const checks = []
  try {
    const suffix = crypto.randomBytes(4).toString('hex')
    async function person(role, tag, extra = {}) {
      return User.create({ firstNameAr: 'اختبار', lastNameAr: tag, email: `v3-${tag}-${suffix}@example.invalid`,
        password: 'TestPassword123!', role, isActive: true, isEmailVerified: true, ...extra })
    }
    const [admin, academicManager, academicSupervisor, academicPeer, administrativeManager, administrativeSupervisor, teacher, student] = await Promise.all([
      person('admin', 'admin', { isPrimaryAdmin: true }),
      person('manager', 'academic-manager', { supervisionTeam: 'academic', supervisionPosition: 'manager', permissions: ['supervision.view', 'supervision.manage'] }),
      person('staff', 'academic-supervisor', { supervisionTeam: 'academic', supervisionPosition: 'supervisor', permissions: ['supervision.view'] }),
      person('staff', 'academic-peer', { supervisionTeam: 'academic', supervisionPosition: 'supervisor', permissions: ['supervision.view'] }),
      person('manager', 'administrative-manager', { supervisionTeam: 'administrative', supervisionPosition: 'manager', permissions: ['supervision.view', 'supervision.manage'] }),
      person('staff', 'administrative-supervisor', { supervisionTeam: 'administrative', supervisionPosition: 'supervisor', permissions: ['supervision.view'] }),
      person('teacher', 'teacher', { gender: 'male' }), person('student', 'student'),
    ])
    const token = (user) => signAccessToken({ id: String(user._id) })
    async function api(user, method, path, body, expected = 200) {
      const response = await fetch(origin + path, { method, headers: {
        ...(user ? { Authorization: `Bearer ${token(user)}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}),
      }, ...(body ? { body: JSON.stringify(body) } : {}) })
      const payload = await response.json()
      assert.equal(response.status, expected, `${method} ${path} expected ${expected}, got ${response.status}: ${JSON.stringify(payload).slice(0, 600)}`)
      return payload
    }
    const now = new Date()
    const start = new Date(now.getTime() - 60 * 60000)
    const end = new Date(now.getTime() + 60 * 60000)
    const lessonTime = new Date(now.getTime() - 30 * 60000)
    await api(null, 'GET', '/people', undefined, 401)
    await api(student, 'GET', '/people', undefined, 403)
    await api(teacher, 'GET', '/people', undefined, 403)
    checks.push('role gates: anonymous, student and teacher denied')

    const academicShift = (await api(admin, 'POST', '/shifts', { team: 'academic', name: 'شيفت اختبار متداخل', startsAt: start, endsAt: end,
      members: [academicSupervisor._id, academicPeer._id], timezone: 'Africa/Cairo' }, 201)).data
    await api(admin, 'POST', '/shifts', { team: 'administrative', name: 'شيفت إداري تجريبي', startsAt: start, endsAt: end,
      members: [administrativeSupervisor._id], timezone: 'Africa/Cairo' }, 201)
    await api(academicManager, 'GET', '/people?team=administrative', undefined, 403)
    await api(administrativeManager, 'GET', '/people?team=academic', undefined, 403)
    await api(academicSupervisor, 'POST', '/shifts', { team: 'academic', name: 'ممنوع', startsAt: start, endsAt: end,
      members: [academicSupervisor._id], timezone: 'Africa/Cairo' }, 403)
    await api(academicSupervisor, 'POST', `/shift-records/${academicShift._id}/check-in`)
    await api(academicSupervisor, 'POST', `/shift-records/${academicShift._id}/handoff`, { note: 'تسليم مبكر ممنوع' }, 403)
    const finishedShift = (await api(academicManager, 'POST', '/shifts', { team: 'academic', name: 'شيفت منتهٍ للتسليم',
      startsAt: new Date(now.getTime() - 90 * 60000), endsAt: new Date(now.getTime() - 2 * 60000),
      members: [academicPeer._id], timezone: 'Africa/Cairo' }, 201)).data
    await api(academicPeer, 'POST', `/shift-records/${finishedShift._id}/handoff`, { note: 'المهام المفتوحة في سجل الفريق' })
    await api(academicPeer, 'POST', `/shift-records/${finishedShift._id}/report`, { analysis: 'تم تسليم الشيفت' })
    await api(academicPeer, 'POST', `/shift-records/${finishedShift._id}/report`, { analysis: 'إرسال مكرر' }, 409)
    const finishedRecord = await api(academicManager, 'GET', `/shift-records/${finishedShift._id}?memberId=${academicPeer._id}`)
    assert.equal(finishedRecord.data.report, 'on_time')
    checks.push('five supervision roles: team isolation and overlapping shifts')
    checks.push('shift attendance, timely handoff/report, duplicate submission protection')

    const academicAssignment = { team: 'academic', teacherId: teacher._id, supervisorId: academicSupervisor._id,
      startsAt: start, primary: true, reason: 'QA' }
    await api(academicManager, 'POST', '/assignments', academicAssignment, 201)
    await api(academicManager, 'POST', '/assignments', academicAssignment, 409)
    await api(academicManager, 'POST', '/assignments', { ...academicAssignment, supervisorId: academicPeer._id, primary: false }, 201)
    await api(administrativeManager, 'POST', '/assignments', { ...academicAssignment, team: 'administrative',
      supervisorId: administrativeSupervisor._id }, 201)
    const reminderLesson = await Session.create({ studentId: student._id, teacherId: teacher._id, titleAr: 'حلقة تنبيه تجريبية',
      scheduledAt: new Date(now.getTime() + 30 * 60000), durationMinutes: 20, status: 'scheduled' })
    const fiveMinuteLesson = await Session.create({ studentId: student._id, teacherId: teacher._id, titleAr: 'حلقة تنبيه خمس دقائق',
      scheduledAt: new Date(now.getTime() + 5 * 60000), durationMinutes: 20, status: 'scheduled' })
    const changedLesson = await Session.create({ studentId: student._id, teacherId: teacher._id, titleAr: 'حلقة تغير موعدها',
      scheduledAt: new Date(now.getTime() + 5 * 60000), durationMinutes: 20, status: 'scheduled' })
    changedLesson.scheduledAt = new Date(now.getTime() + 7 * 60000)
    await changedLesson.save()
    await runSessionReminders(now)
    await runSessionReminders(now)
    const reminders = await Notification.find({ relatedId: reminderLesson._id, 'metadata.offsetMinutes': 30 }).lean()
    const reminderRecipients = new Set(reminders.map((row) => String(row.userId)))
    assert.deepEqual(reminderRecipients, new Set([student, teacher, academicSupervisor, academicPeer, administrativeSupervisor].map((row) => String(row._id))))
    assert.equal(reminders.length, reminderRecipients.size)
    const fiveMinuteReminders = await Notification.find({ relatedId: fiveMinuteLesson._id, 'metadata.offsetMinutes': 5 }).lean()
    assert.deepEqual(new Set(fiveMinuteReminders.map((row) => String(row.userId))), reminderRecipients)
    assert.equal(fiveMinuteReminders.length, reminderRecipients.size)
    assert.equal(await Notification.countDocuments({ relatedId: changedLesson._id, 'metadata.offsetMinutes': 5 }), 0)
    checks.push('30m/5m reminders: assigned active recipients exactly once; changed schedule suppresses stale notice')
    const lesson = await Session.create({ studentId: student._id, teacherId: teacher._id, titleAr: 'حلقة تحقق V3',
      scheduledAt: lessonTime, durationMinutes: 20, status: 'completed', completedAt: new Date(now.getTime() - 5 * 60000) })
    const from = new Date(now.getTime() - 2 * 3600000).toISOString()
    const to = now.toISOString()
    const ownDaily = await api(academicSupervisor, 'GET', `/daily-sessions?team=academic&from=${from}&to=${to}`)
    assert.equal(ownDaily.data.length, 1)
    assert.equal(ownDaily.data[0].academicFollowups.length, 1)
    const managerDaily = await api(academicManager, 'GET', `/daily-sessions?team=academic&from=${from}&to=${to}`)
    assert.equal(managerDaily.data[0].academicFollowups.length, 2)
    const administrativeDaily = await api(administrativeSupervisor, 'GET', `/daily-sessions?team=administrative&from=${from}&to=${to}`)
    assert.equal(administrativeDaily.data.length, 1)
    checks.push('dated assignments and one lesson shared by academic/administrative teams')

    const report = (await api(academicSupervisor, 'PUT', `/academic-reports/session/${lesson._id}`, {
      observation: 'observed', observationSource: 'manual_meeting', observationCategory: 'lesson_quality',
      lessonFlow: 'تمت الحلقة', studentLevel: 'جيد', teacherPerformance: 'جيد', rating: 'good',
      teacherGuidance: 'يرجى متابعة المراجعة', observations: 'ملاحظة تجريبية',
    })).data
    await api(academicSupervisor, 'POST', `/academic-reports/${report._id}/submit`)
    await api(academicSupervisor, 'POST', `/academic-reports/${report._id}/submit`, undefined, 409)
    const inbox = await api(teacher, 'GET', '/teacher-guidance')
    assert.equal(inbox.data.length, 1)
    assert.equal(inbox.data[0].teacherGuidance, 'يرجى متابعة المراجعة')
    assert.equal(inbox.data[0].observations, undefined)
    await api(teacher, 'POST', `/teacher-guidance/${report._id}/reply`, { status: 'acknowledged' })
    await api(student, 'GET', `/academic-reports/${report._id}`, undefined, 403)
    await api(administrativeManager, 'GET', `/academic-reports/${report._id}`, undefined, 403)
    await api(academicManager, 'POST', `/academic-reports/${report._id}/review`, { decision: 'reviewed' })
    checks.push('R1: one submission, manager review, private teacher guidance and student denial')

    const exception = (await api(administrativeSupervisor, 'POST', '/exceptions', { sessionId: lesson._id,
      type: 'other', reason: 'متابعة تجريبية', ownerId: administrativeSupervisor._id,
      followUpAt: new Date(now.getTime() + 86400000) }, 201)).data
    await api(academicSupervisor, 'POST', `/exceptions/${exception._id}/resolve`, { resolution: 'غير مصرح' }, 403)
    await api(administrativeManager, 'PATCH', `/exceptions/${exception._id}/owner`, { ownerId: administrativeManager._id,
      followUpAt: new Date(now.getTime() + 2 * 86400000) })
    await api(administrativeManager, 'POST', `/exceptions/${exception._id}/resolve`, { resolution: 'أغلقت بعد المتابعة' })
    await api(administrativeManager, 'POST', `/exceptions/${exception._id}/resolve`, { resolution: 'إغلاق مكرر' }, 409)
    checks.push('administrative exception: owner handoff, closure history and academic denial')

    const cairoDate = formatInTimeZone(lessonTime, 'Africa/Cairo', 'yyyy-MM-dd')
    const expectedDailyTotal = [lesson, reminderLesson, fiveMinuteLesson, changedLesson]
      .filter((row) => formatInTimeZone(row.scheduledAt, 'Africa/Cairo', 'yyyy-MM-dd') === cairoDate).length
    const monthlyStart = `${cairoDate.slice(0, 7)}-01`
    const metricsPath = `/periodic-metrics?team=academic&start=${cairoDate}`
    const metrics = await api(academicManager, 'GET', metricsPath)
    assert.equal(metrics.data.counts.total, expectedDailyTotal)
    assert.equal(metrics.data.counts.observed, 1)
    assert.deepEqual(metrics.data.observationCategories.map((row) => [row._id, row.reports]), [['lesson_quality', 1]])
    const administrativeMetrics = await api(administrativeManager, 'GET', `/periodic-metrics?team=administrative&start=${cairoDate}`)
    assert.equal(administrativeMetrics.data.counts.total, expectedDailyTotal)
    assert.equal(administrativeMetrics.data.achievements, null)
    await api(academicSupervisor, 'GET', `/periodic-metrics?team=administrative&start=${cairoDate}`, undefined, 403)
    checks.push('real Mongo aggregates: distinct lesson, R1 category, and team-safe metrics')

    const periodic = (await api(academicSupervisor, 'POST', '/periodic-reports', { type: 'R4', start: monthlyStart,
      analysis: { rating: 'good', achievements: 'اكتمل التدريب', distinguishedStudents: [{ personId: student._id,
        reason: 'تقدم واضح' }], distinguishedTeachers: [{ personId: teacher._id, reason: 'أداء جيد' }] } })).data
    await api(academicSupervisor, 'POST', `/periodic-reports/${periodic._id}/submit`)
    await api(administrativeManager, 'GET', `/periodic-reports/${periodic._id}`, undefined, 403)
    await api(academicManager, 'POST', `/periodic-reports/${periodic._id}/review`, { decision: 'approved' })
    const recognition = await api(academicManager, 'GET', `/academic-recognition?start=${monthlyStart}`)
    assert.equal(recognition.data.candidates.students.length, 1)
    assert.equal(recognition.data.candidates.teachers.length, 1)
    checks.push('R4 approval and recognition sourced from an approved nomination')

    await ScheduleRule.create({ teacherId: teacher._id, studentId: student._id, startDate: start, status: 'active' })
    const cohortStudents = await Promise.all(Array.from({ length: 19 }, (_, i) => person('student', `cohort-${i}`)))
    const cohort = (await api(academicManager, 'POST', '/cohorts', { team: 'academic', name: 'مجموعة اختبار التغطية', studentIds: [student._id, ...cohortStudents.map((row) => row._id)] }, 201)).data
    assert.equal((await api(academicManager, 'GET', `/cohorts/${cohort._id}`)).data.total, 20)
    await api(academicManager, 'POST', '/assignments', { team: 'academic', scopeType: 'cohort', cohortId: cohort._id,
      supervisorId: academicPeer._id, startsAt: now, primary: true }, 201)
    const assignedSession = `/daily-sessions?team=academic&from=${now.toISOString()}&to=${end.toISOString()}&sessionId=${reminderLesson._id}`
    assert.equal((await api(academicPeer, 'GET', assignedSession)).data.length, 1)
    assert.equal((await api(academicSupervisor, 'GET', assignedSession)).data.length, 0)
    await api(academicManager, 'POST', '/assignments', { team: 'academic', scopeType: 'student', teacherId: teacher._id,
      studentId: student._id, supervisorId: academicSupervisor._id, startsAt: now, primary: true }, 201)
    assert.equal((await api(academicSupervisor, 'GET', assignedSession)).data.length, 1)
    assert.equal((await api(academicPeer, 'GET', assignedSession)).data.length, 0)
    const profile = await api(admin, 'GET', `/profiles/student/${student._id}`)
    assert.equal(String(profile.data.owners.find((row) => row.team === 'academic')?.supervisorId?._id), String(academicSupervisor._id))
    checks.push('V3-9.1: cohort ownership, student override, paginated access and admin student profile')
    await api(academicManager, 'PATCH', `/cohorts/${cohort._id}`, { name: 'مجموعة معدلة', notes: 'مراجعة دورة المجموعة' })
    await api(academicManager, 'PATCH', `/cohorts/${cohort._id}`, { isActive: false })
    assert.equal((await api(academicManager, 'GET', `/cohorts/${cohort._id}`)).data.total, 0)
    assert.equal((await api(academicManager, 'GET', `/cohorts/${cohort._id}?history=true`)).data.total, 20)
    await api(academicManager, 'PATCH', `/cohorts/${cohort._id}`, { isActive: true })
    const reopened = (await api(academicManager, 'GET', `/cohorts/${cohort._id}`)).data
    assert.equal(reopened.isActive, true)
    assert.equal(reopened.total, 0)
    assert.equal(reopened.name, 'مجموعة معدلة')
    checks.push('20-student cohort: rename, closure, retained history and safe reopening')

    const persisted = await Observation.findById(report._id).lean()
    assert.equal(persisted.teacherReplyStatus, 'acknowledged')
    assert.equal(await Assignment.countDocuments({ team: 'academic', teacherId: teacher._id }), 3)
    console.log(JSON.stringify({ status: 'passed', database: dbName, ...(process.env.V3_QA_KEEP === '1' ? { accountSuffix: suffix } : {}), checks }, null, 2))
  } finally {
    await new Promise((resolve) => server.close(resolve))
    assert.match(mongoose.connection.name, /^tartelah_v3_qa_[a-f0-9]{12}$/)
    if (process.env.V3_QA_KEEP !== '1') await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1 })
