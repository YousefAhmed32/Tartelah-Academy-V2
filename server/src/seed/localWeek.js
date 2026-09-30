// Additive local demo. Existing records (including edited demo records) are never overwritten.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')
const crypto = require('crypto')
const { formatInTimeZone, fromZonedTime } = require('date-fns-tz')
const { SUPERVISION_PERMISSIONS, ALL_PERMISSIONS } = require('../config/permissions')
const { applyTransaction } = require('../services/wallet.service')
const model = (name) => require(`../models/${name}`)
const id = (key) => new mongoose.Types.ObjectId(crypto.createHash('sha256').update(`local-week-v1:${key}`).digest('hex').slice(0, 24))
const counts = {}
async function ensure(name, key, data, query = { _id: id(key) }) {
  const Model = model(name)
  const existing = await Model.findOne(query)
  if (existing) return existing
  const doc = await Model.create({ ...data, _id: id(key) })
  counts[name] = (counts[name] || 0) + 1
  return doc
}

async function run() {
  const uri = process.env.MONGO_URI
  const parsed = new URL(uri)
  if (process.env.NODE_ENV === 'production' || parsed.protocol !== 'mongodb:' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
    throw new Error('Local demo requires non-production and localhost MongoDB')
  }
  await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME || 'tartelah' })
  const settings = await model('AcademySettings').findOne().lean()
  const timezone = settings?.timezone || 'Africa/Cairo'
  const today = formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')
  function day(offset) {
    const date = new Date(`${today}T12:00:00Z`)
    date.setUTCDate(date.getUTCDate() + offset)
    return date.toISOString().slice(0, 10)
  }
  const at = (offset, time) => fromZonedTime(`${day(offset)}T${time}:00`, timezone)
  const password = 'DemoWeek123!'
  async function user(email, data) {
    const existing = await model('User').findOne({ email })
    if (existing && (existing.role !== data.role || (data.supervisionTeam &&
        (existing.supervisionTeam !== data.supervisionTeam || existing.supervisionPosition !== data.supervisionPosition)))) {
      throw new Error(`Account identity collision: ${email}`)
    }
    return ensure('User', email, { email, password, isActive: true, isEmailVerified: true,
      firstNameAr: 'تجريبي', lastNameAr: 'الأسبوع', ...data }, { email })
  }
  const admin = await user('demo.admin@tartelah.local', { role: 'admin', permissions: ALL_PERMISSIONS })
  const staff = {}
  for (const team of ['academic', 'administrative']) {
    staff[team] = {}
    for (const position of ['supervisor', 'manager']) {
      staff[team][position] = await user(`${team}.${position}@tartelah.com`, {
        role: position === 'manager' ? 'manager' : 'staff', supervisionTeam: team,
        supervisionPosition: position, permissions: SUPERVISION_PERMISSIONS[position],
        firstNameAr: position === 'manager' ? 'مدير' : 'مشرف',
        lastNameAr: team === 'academic' ? 'أكاديمي' : 'إداري',
        password: 'Supervisor123!',
      })
    }
  }
  await ensure('TeachingSubject', 'subject', { key: 'hifz', nameAr: 'حفظ القرآن', isSystem: true }, { key: 'hifz' })
  const course = await ensure('Course', 'course', { slug: 'local-week-hifz', nameAr: 'برنامج حفظ جزء عم — تجربة محلية', category: 'hifz', status: 'published' }, { slug: 'local-week-hifz' })
  const pkg = await ensure('Package', 'package', { nameAr: 'باقة التجربة المحلية — ٢٤ حصة', price: 600, sessionsPerMonth: 24, durationDays: 30, showOnLandingPage: false })
  const teachers = []
  for (let i = 0; i < 2; i++) {
    teachers.push(await user(`demo.teacher${i + 1}@tartelah.local`, { role: 'teacher',
      firstNameAr: i ? 'مريم' : 'أحمد', lastNameAr: 'معلم تجريبي', gender: i ? 'female' : 'male',
      specializations: ['hifz'], salaryPerSession: 50 }))
    for (const team of Object.keys(staff)) {
      await ensure('SupervisionAssignment', `assignment:${team}:${i}`, { team, scopeType: 'teacher',
        teacherId: teachers[i]._id, supervisorId: staff[team].supervisor._id,
        startsAt: at(-30, '00:00'), endsAt: null, createdBy: staff[team].manager._id, reason: 'تغطية بيانات التجربة المحلية' })
    }
  }
  const shifts = {}
  for (let d = -3; d <= 7; d++) {
    for (const team of Object.keys(staff)) {
      const shift = await ensure('SupervisionShift', `shift:${team}:${day(d)}`, { team,
        name: 'وردية التجربة المسائية', startsAt: at(d, '15:00'), endsAt: at(d, '22:00'), timezone,
        members: [staff[team].supervisor._id], createdBy: staff[team].manager._id })
      shifts[`${team}:${d}`] = shift
      if (d <= 0) await ensure('SupervisionShiftRecord', `shift-record:${team}:${day(d)}`, {
        shiftId: shift._id, memberId: staff[team].supervisor._id, team,
        ...(d < 0 ? { checkedInAt: at(d, '15:00'), checkedOutAt: at(d, '22:00'), handedOffAt: at(d, '22:00'),
          handoffNote: 'متابعة استعداد الطلاب والاختبار الشفهي خلال الأسبوع القادم' } : {}),
        analysis: 'مسودة تجريبية قابلة للإكمال والإرسال', reportDueAt: at(d + 1, '00:00'),
      })
    }
  }
  const names = ['يوسف', 'عمر', 'سارة', 'نور', 'عبدالله', 'فاطمة']
  const cohorts = {}
  for (const team of Object.keys(staff)) {
    cohorts[team] = await ensure('SupervisionCohort', `cohort:${team}`, { team, name: 'مجموعة جزء عم — تجربة محلية',
      notes: 'ستة طلاب للتجربة الأسبوعية', createdBy: staff[team].manager._id })
    await ensure('SupervisionAssignment', `cohort-assignment:${team}`, { team, scopeType: 'cohort',
      cohortId: cohorts[team]._id, supervisorId: staff[team].supervisor._id, startsAt: at(-30, '00:00'), endsAt: null, createdBy: staff[team].manager._id })
  }
  for (let i = 0; i < names.length; i++) {
    const student = await user(`demo.student${i + 1}@tartelah.local`, { role: 'student', firstNameAr: names[i], lastNameAr: 'طالب تجريبي' })
    const teacher = teachers[i % 2]
    for (const team of Object.keys(staff)) await ensure('SupervisionCohortMember', `cohort-member:${team}:${i}`, {
      team, cohortId: cohorts[team]._id, studentId: student._id, startsAt: at(-30, '00:00'), createdBy: staff[team].manager._id })
    const sub = await ensure('Subscription', `subscription:${i}:${today}`, { studentId: student._id, teacherId: teacher._id,
      courseId: course._id, packageId: pkg._id, packageNameAr: pkg.nameAr, startDate: at(-3, '00:00'),
      endDate: at(30, '23:59'), amountPaid: 600, createdBy: admin._id, notes: 'بيانات محلية للتجربة' })
    const purchase = await applyTransaction({ studentId: student._id, type: 'purchase', amount: 24,
      idempotencyKey: `local-week:purchase:${sub._id}`, relatedSubscriptionId: sub._id,
      reason: 'شراء تجريبي محلي', performedByRole: 'admin', performedBy: admin._id })
    if (!sub.walletTransactionId) await model('Subscription').updateOne({ _id: sub._id }, { walletTransactionId: purchase.transaction._id })
    const time = `${16 + Math.floor(i / 2)}:00`
    const rule = await ensure('ScheduleRule', `rule:${i}:${today}`, { teacherId: teacher._id, studentId: student._id,
      subscriptionId: sub._id, frequency: 'daily', timeOfDay: time, durationMinutes: 45,
      startDate: at(0, '00:00'), endDate: at(7, '23:59'), timezone, titleTemplate: 'حفظ ومراجعة — تجربة محلية' })
    for (const d of [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7]) {
      const scheduledAt = at(d, time)
      const finished = d < 0
      const end = new Date(scheduledAt.getTime() + 45 * 60000)
      const session = await ensure('Session', `session:${i}:${day(d)}`, { studentId: student._id, teacherId: teacher._id,
        subscriptionId: sub._id, courseId: course._id, ...(finished ? {} : { seriesId: rule._id }),
        titleAr: d === 6 ? 'اختبار شفهي تجريبي — جزء عم' : 'حفظ ومراجعة جزء عم — تجربة محلية',
        scheduledAt, durationMinutes: 45, status: finished ? 'completed' : 'scheduled',
        meetingProvider: 'custom', notes: 'بيانات تجريبية؛ أضف رابط اجتماعك قبل تجربة الانضمام.',
        ...(finished ? { completedAt: end, actualStartAt: scheduledAt, actualEndAt: end,
          outcome: 'delivered', teacherStartedAt: scheduledAt, teacherAttendanceStatus: 'on_time',
          attendanceFinalizedAt: end, attendanceFinalizedBy: teacher._id, payrollStatus: 'payable' } : {}),
        administrativeReadiness: { student: i % 3 ? 'ready' : 'unknown', teacher: 'ready', link: 'unknown', updatedBy: staff.administrative.supervisor._id },
      })
      if (finished) {
        const deduction = await applyTransaction({ studentId: student._id, type: 'consumption', amount: -1,
          idempotencyKey: `local-week:consume:${session._id}`, relatedSessionId: session._id,
          relatedSubscriptionId: sub._id, reason: 'حصة تجريبية مكتملة' })
        if (!session.subscriptionConsumed) await model('Session').updateOne({ _id: session._id }, {
          subscriptionConsumed: true, subscriptionConsumedAt: end, lessonConsumedTransactionId: deduction.transaction._id, lessonConsumptionSeq: 1 })
        const refs = { sessionId: session._id, studentId: student._id, teacherId: teacher._id }
        await ensure('Attendance', `attendance:${session._id}`, { ...refs, status: 'present', recordedAt: scheduledAt,
          isFinalized: true, finalizedAt: end, finalizedBy: teacher._id })
        const evaluation = await ensure('Evaluation', `evaluation:${session._id}`, { ...refs, type: 'hifz', score: 7 + i % 3, notesAr: 'تحسن ملحوظ في الحفظ — بيانات تجريبية' })
        for (const name of ['Memorization', 'Revision']) await ensure(name, `${name}:${session._id}`, {
          ...refs, surahNumber: name === 'Revision' ? 112 : 114, fromAyah: 1, toAyah: name === 'Revision' ? 4 : 6,
          quality: i % 2 ? 'excellent' : 'good', recordedAt: scheduledAt })
        // Two missing teacher reports remain available for supervisor follow-up.
        if (!(d === -1 && i < 2)) await ensure('QuranSessionReport', `report:${session._id}`, {
          ...refs, createdBy: teacher._id, evaluationId: evaluation._id, status: 'submitted', submittedAt: end,
          todayRecitation: 'سورة الناس', todayRevision: 'سورة الإخلاص', nextRecitation: 'سورة الفلق',
          nextTajweed: 'تطبيق أحكام النون الساكنة', generalEvaluation: 'أداء جيد مع الحاجة للمراجعة اليومية' })
        await ensure('AcademicObservationReport', `r1:${session._id}`, { ...refs,
          supervisorId: staff.academic.supervisor._id, scheduledAt, shiftId: shifts[`academic:${d}`]._id,
          dueAt: at(d + 1, '00:00'), observation: 'observed', observedAt: scheduledAt, observationSource: 'manual_other',
          evidenceNote: 'سيناريو تجريبي محلي وليس رصد اجتماع فعلي', status: d === -1 ? 'draft' : 'submitted',
          ...(d === -1 ? {} : { submittedAt: end, submissionVersion: 1, publishedTeacherGuidance: 'تخصيص خمس دقائق للمراجعة', teacherReplyStatus: 'pending', teacherGuidanceVersion: 1 }),
          lessonFlow: 'تسميع ثم مراجعة وتطبيق التجويد', studentLevel: 'يتحسن تدريجيا', teacherPerformance: 'شرح واضح',
          observations: 'متابعة المراجعة اليومية', rating: i % 2 ? 'excellent' : 'good', observationCategory: 'student_progress' })
      }
      if (d === 0 || d === 2) await ensure('SupervisionDailyAction', `action:${session._id}`, {
        sessionId: session._id, team: 'administrative', category: 'readiness', description: 'تأكيد استعداد الطالب وإضافة رابط الاجتماع التجريبي',
        ownerId: staff.administrative.supervisor._id, createdBy: staff.administrative.manager._id })
      if (d === 1 && i < 2) await ensure('SupervisionException', `exception:${session._id}`, {
        sessionId: session._id, studentId: student._id, originalTeacherId: teacher._id, currentTeacherId: teacher._id,
        sessionScheduledAt: scheduledAt, type: 'link_issue', reason: 'حالة تجريبية: مطلوب تجهيز رابط الاجتماع',
        ownerId: staff.administrative.supervisor._id, followUpAt: scheduledAt, createdBy: staff.administrative.manager._id })
      if (d === -1 && i === 0) await ensure('SupervisionAdjustmentRequest', `adjustment:${session._id}`, {
        sessionId: session._id, teacherId: teacher._id, supervisionTeacherId: teacher._id, sessionScheduledAt: scheduledAt,
        accountType: 'teacher_payroll', accountOwnerId: teacher._id, unit: 'EGP', requestedAmount: 10,
        reason: 'طلب تجريبي لاختبار قرار المدير؛ لم يتم تطبيق أي خصم', requestedBy: staff.administrative.supervisor._id })
    }
    await ensure('StudentAcademicPlan', `plan:${i}`, { studentId: student._id, subjectKey: 'hifz', courseId: course._id,
      level: 'مبتدئ', goal: 'إتقان سور الإخلاص والفلق والناس خلال أسبوع', nextStep: 'اختبار شفهي في اليوم السابع',
      status: 'published', createdBy: staff.academic.supervisor._id, publishedBy: staff.academic.manager._id, publishedAt: at(-3, '14:00'),
      milestones: [{ title: 'حفظ سورة الناس', status: 'completed', completedAt: at(-1, '18:00'),
        externalTest: { testedAt: at(-1, '18:00'), result: 'نتيجة تجريبية: جيد جدا', visibleToStudent: true, recordedBy: staff.academic.supervisor._id } },
      { title: 'مراجعة السور الثلاث', status: 'in_progress' }, { title: 'اختبار شفهي للسور الثلاث في نهاية الأسبوع', status: 'planned' }] })
    await ensure('Homework', `homework:${i}:${today}`, { teacherId: teacher._id, courseId: course._id,
      assignedTo: [student._id], titleAr: 'مراجعة السور الثلاث استعدادا للاختبار الشفهي', dueDate: at(6, '20:00'),
      descriptionAr: 'تسميع الإخلاص والفلق والناس ومراجعة أحكام النون الساكنة.' })
  }
  const directive = await ensure('AcademicDirective', 'directive', { authorId: staff.academic.manager._id,
    title: 'خطة المتابعة للأسبوع التجريبي', body: 'متابعة المراجعة اليومية وتجهيز الاختبار الشفهي وتوثيق نتيجته في الخطة.',
    targetType: 'all', recipientCount: 3 })
  for (const recipient of [...teachers, staff.academic.supervisor]) await ensure('AcademicDirectiveReceipt', `receipt:${recipient._id}`, {
    directiveId: directive._id, recipientId: recipient._id })
  await ensure('AcademicDevelopmentCase', 'development', { personId: teachers[0]._id, personType: 'teacher',
    authorId: staff.academic.manager._id, title: 'متابعة تنويع أساليب المراجعة — تجربة', strengths: 'وضوح الشرح',
    improvement: 'زيادة مشاركة الطالب في المراجعة', nextAction: 'مراجعة التطبيق في الحصة القادمة' })
  console.log(JSON.stringify({ database: mongoose.connection.name, timezone, from: day(0), through: day(7), created: counts }, null, 2))
}

if (require.main === module) run().catch(error => { console.error(error.message); process.exitCode = 1 })
  .finally(() => mongoose.disconnect())
module.exports = { run }
