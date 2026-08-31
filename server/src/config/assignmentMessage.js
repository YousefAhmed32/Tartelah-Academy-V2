// Generates the default Arabic teacher-assignment message (Phase 2 Part 2
// §9). Pure, deterministic, no DB access — the caller (assignment.service.js)
// supplies already-resolved, already-escaped-by-nature plain-text fields (no
// HTML is ever involved; the frontend renders this as plain text, never via
// dangerouslySetInnerHTML, which is the actual XSS boundary — see
// AssignmentReviewMessage.jsx). An administrator may freely edit the result
// before sending (editedMessage on AssignmentRequest); this function only
// produces the DEFAULT starting point.
//
// Gender-aware wording is used ONLY when User.gender is canonically set
// (never inferred from a name) — falls back to slash-neutral Arabic
// otherwise, per the brief's explicit "never guess gender" requirement.

const DAY_LABELS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const CURRICULUM_LABELS_AR = {
  tajweed: 'التجويد',
  hifz: 'الحفظ',
  nazra: 'النظر',
  arabic: 'اللغة العربية',
  quran: 'القرآن الكريم',
  other: 'أخرى',
}

const DURATION_LABELS = {
  30: '30 دقيقة',
  45: '45 دقيقة',
  60: 'ساعة كاملة',
  90: 'ساعة ونصف',
}

const TEACHING_TYPE_LABELS_AR = {
  individual: 'حصص فردية',
  group: 'حصص جماعية',
}

function dayLabel(dayOfWeek) {
  return DAY_LABELS_AR[dayOfWeek] || ''
}

function curriculumLabel(value) {
  return CURRICULUM_LABELS_AR[value] || value || 'غير محدد'
}

function durationLabel(minutes) {
  return DURATION_LABELS[minutes] || `${minutes} دقيقة`
}

function formatScheduleDays(days) {
  if (!Array.isArray(days) || !days.length) return 'غير محدد'
  return [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((d) => dayLabel(d.dayOfWeek)).join('، ')
}

function formatScheduleTimes(days) {
  if (!Array.isArray(days) || !days.length) return 'غير محدد'
  const uniqueTimes = [...new Set(days.map((d) => d.time))]
  if (uniqueTimes.length === 1) return uniqueTimes[0]
  // Different times per day — spell out each day's own time explicitly
  // rather than collapsing into a misleading single value.
  return [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((d) => `${dayLabel(d.dayOfWeek)} ${d.time}`).join('، ')
}

/**
 * `studentGender` is the CANONICAL User.gender value ('male'|'female') if
 * known, otherwise undefined/null — never guessed. Returns the full
 * gender-correct (or neutral) noun phrase used in place of the template's
 * "{studentGenderLabel} جديدة" segment, since Arabic adjective agreement
 * ("جديد" vs "جديدة") cannot be split from the noun without producing
 * ungrammatical text for the male case.
 */
function studentIntroPhrase(studentGender) {
  if (studentGender === 'male') return 'طالب جديد'
  if (studentGender === 'female') return 'طالبة جديدة'
  return 'طالب/طالبة جديد/جديدة'
}

function studentDataLabel(studentGender) {
  if (studentGender === 'male') return 'الطالب'
  if (studentGender === 'female') return 'الطالبة'
  return 'الطالب/الطالبة'
}

/**
 * Possessive "his/her data" (بياناته/بياناتها) used in the intro line right
 * after studentIntroPhrase() — kept separate from studentDataLabel() (which
 * labels the section header "بيانات الطالب/الطالبة" further down) because
 * the two lines use different Arabic constructions. Previously hardcoded to
 * the feminine "بياناتها" regardless of gender — a real agreement bug for
 * male students, fixed here to follow the same never-guess-gender rule as
 * the rest of this file.
 */
function studentDataPossessive(studentGender) {
  if (studentGender === 'male') return 'بياناته'
  if (studentGender === 'female') return 'بياناتها'
  return 'بياناته/بياناتها'
}

/**
 * Builds the default Arabic assignment message. All string inputs are
 * treated as plain text — the caller must never render the result as HTML.
 *
 * `curriculum` is the raw stored key ('tajweed', or a dynamic
 * TeachingSubject's key for a newly admin-created subject like
 * "الرياضيات") and `curriculumLabelOverride` is that key's ALREADY-RESOLVED
 * Arabic display label. This function stays pure/synchronous/DB-free by
 * design (see module header) — resolving a dynamic subject's label requires
 * a DB read, so the caller (assignment.service.js) must resolve it first via
 * services/teachingSubject.service.js's resolveLabel() and pass the result
 * here. `curriculumLabelOverride` always wins when provided; `curriculum` +
 * the static legacy map remain a fallback for any caller (e.g. existing
 * tests) that only has one of the six canonical keys.
 */
function buildAssignmentMessage({
  teacherName,
  studentGender,
  studentName,
  studentAge,
  curriculum,
  curriculumLabelOverride,
  scheduleDays,
  scheduleTimes,
  lessonDurationMinutes,
  teachingType,
  startDate,
}) {
  const introPhrase = studentIntroPhrase(studentGender)
  const dataLabel = studentDataLabel(studentGender)
  const dataPossessive = studentDataPossessive(studentGender)
  const daysText = Array.isArray(scheduleDays) ? formatScheduleDays(scheduleDays) : (scheduleDays || 'غير محدد')
  const timesText = Array.isArray(scheduleTimes) ? formatScheduleTimes(scheduleTimes) : (scheduleTimes || 'غير محدد')
  const startDateText = startDate ? new Date(startDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير محدد'
  const curriculumText = curriculumLabelOverride || curriculumLabel(curriculum)

  return `السلام عليكم ورحمة الله وبركاته 🌷

أ. ${teacherName}
حفظكم الله ورعاكم 🤍

نحيطكم علمًا بأنه تمت إضافة ${introPhrase} إلى جدول حضرتكم، و${dataPossessive} كالتالي:

━━━━━━━━━━━━━━━━━━
👤 بيانات ${dataLabel}
━━━━━━━━━━━━━━━━━━

🌸 الاسم: ${studentName}
🎂 العمر: ${studentAge || 'غير محدد'}
📖 المنهج: ${curriculumText}

━━━━━━━━━━━━━━━━━━
🗓️ بيانات الحلقة
━━━━━━━━━━━━━━━━━━

📅 الأيام: ${daysText}
⏰ الموعد: ${timesText}
⏱️ مدة الحصة: ${durationLabel(lessonDurationMinutes)}
📚 نوع التدريس: ${TEACHING_TYPE_LABELS_AR[teachingType] || 'حصص فردية'}
📆 تاريخ البداية: ${startDateText}

نسأل الله أن يبارك في هذه الحلقة، وينفعكم وينفع بها، ويكتب لكم الأجر والتوفيق في تعليم كتاب الله 🤍

جزاكم الله خيرًا وبارك في علمكم وجهودكم 🌹`
}

module.exports = {
  DAY_LABELS_AR, CURRICULUM_LABELS_AR, DURATION_LABELS, TEACHING_TYPE_LABELS_AR,
  dayLabel, curriculumLabel, durationLabel, formatScheduleDays, formatScheduleTimes,
  studentIntroPhrase, studentDataLabel, studentDataPossessive, buildAssignmentMessage,
}
