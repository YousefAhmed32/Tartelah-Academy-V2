/**
 * Additive Enrichment Data Seeder for Tartelah Online
 *
 * This script SAFELY enriches an existing database without deleting or wiping anything.
 * It populates realistic, high-quality Quran academy data across:
 *   1. Reports & Analytics (Today, Yesterday, This Week, This Month, Last Month, 6-month trends)
 *   2. Operations Center (Live now, starting soon, missing links, late teachers, pending reviews)
 *   3. Teachers & Evaluations (Scholars, working hours, authentic multi-star evaluations)
 *   4. Quran Session Reports & Memorization/Revision records
 *   5. Monthly Teacher Reports (Current & previous month snapshots)
 *   6. Assignments & Enrollment Requests (Pending, accepted, time-change proposals)
 *   7. Lesson Wallets & Financial Transactions
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')

const User = require('../models/User')
const Package = require('../models/Package')
const Subscription = require('../models/Subscription')
const Session = require('../models/Session')
const Attendance = require('../models/Attendance')
const Evaluation = require('../models/Evaluation')
const QuranSessionReport = require('../models/QuranSessionReport')
const Memorization = require('../models/Memorization')
const Revision = require('../models/Revision')
const MonthlyTeacherReport = require('../models/MonthlyTeacherReport')
const AssignmentRequest = require('../models/AssignmentRequest')
const EnrollmentRequest = require('../models/EnrollmentRequest')
const LessonWallet = require('../models/LessonWallet')
const LessonTransaction = require('../models/LessonTransaction')
const TeacherWorkingHours = require('../models/TeacherWorkingHours')

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const SURAHS = [
  { number: 1, name: 'الفاتحة', count: 7 },
  { number: 2, name: 'البقرة', count: 286 },
  { number: 3, name: 'آل عمران', count: 200 },
  { number: 4, name: 'النساء', count: 176 },
  { number: 5, name: 'المائدة', count: 120 },
  { number: 6, name: 'الأنعام', count: 165 },
  { number: 18, name: 'الكهف', count: 110 },
  { number: 19, name: 'مريم', count: 98 },
  { number: 20, name: 'طه', count: 135 },
  { number: 36, name: 'يس', count: 83 },
  { number: 37, name: 'الصافات', count: 182 },
  { number: 55, name: 'الرحمن', count: 78 },
  { number: 56, name: 'الواقعة', count: 96 },
  { number: 67, name: 'الملك', count: 30 },
  { number: 68, name: 'القلم', count: 52 },
  { number: 78, name: 'النبأ', count: 40 },
  { number: 79, name: 'النازعات', count: 46 },
  { number: 80, name: 'عبس', count: 42 },
  { number: 81, name: 'التكوير', count: 29 },
  { number: 82, name: 'الانفطار', count: 19 },
  { number: 87, name: 'الأعلى', count: 19 },
  { number: 88, name: 'الغاشية', count: 26 },
  { number: 89, name: 'الفجر', count: 30 },
  { number: 93, name: 'الضحى', count: 11 },
  { number: 94, name: 'الشرح', count: 8 },
]

const EVALUATION_FEEDBACKS = [
  {
    notes: 'ما شاء الله تبارك الله، أداء رائع وإتقان متميز لمخارج الحروف والمدود والالتزام بأحكام التجويد.',
    strengths: ['مخارج الحروف دقيقة', 'إتقان المدود', 'الثقة والطلاقة في التلاوة', 'سرعة البديهة في الاستدراك'],
    improvements: ['الانتباه لترقيق الراء المكسورة', 'مراعاة زمن الغنة في الإخفاء'],
  },
  {
    notes: 'تلاوة طيبة جداً وحفظ راسخ، الطالب يبذل جهداً مشكوراً في التحضير والمتابعة المنزلية.',
    strengths: ['حفظ متقن ومترابط', 'الالتزام بأوقات الغنن', 'التفاعل مع التوجيهات'],
    improvements: ['التركيز على القلقلة الصغرى في وسط الكلمة', 'تثبيت الآيات المتشابهة'],
  },
  {
    notes: 'جهد ممتاز وتقدم ملحوظ في أحكام النون الساكنة والتنوين، نوصي بالاستمرار على هذا المستوى العالي.',
    strengths: ['إتقان الإدغام والإقلاب', 'صوت ندي وتلاوة خاشعة', 'حسن الاستماع'],
    improvements: ['مراعاة تفخيم حروف الاستعلاء', 'تكرار ورد المراجعة اليومي'],
  },
  {
    notes: 'أتم مراجعة الجزء الثلاثين بنجاح واقتدار، مستعد للانتقال للمرحلة التالية بإذن الله تعالى.',
    strengths: ['استحضار متقن للآيات', 'التوقف السليم عند رؤوس الآي', 'مواظبة وحرص شديد'],
    improvements: ['ضبط همزات الوصل والقطع'],
  },
  {
    notes: 'بداية مبشرة مع سورة جديدة، يحتاج لمزيد من التكرار مع المعلم لضبط نطق الكلمات الصعبة.',
    strengths: ['حماس ورغبة في التعلم', 'احترام المعلم وآداب الحلقة'],
    improvements: ['زيادة ساعات المراجعة المنزلية', 'التركيز أثناء الشرح'],
  },
]

const TAJWEED_NOTES = [
  'تطبيق متقن لأحكام الميم والنون المشددتين، مع ملاحظة خفيفة على إتمام الكسر.',
  'إتقان أحكام المد اللازم والمد المتصل، يحتاج للتمرن على المد المنفصل بالقصر.',
  'مخارج الحروف اللثوية ممتازة (الثاء والذال والظاء)، والهمس في التاء والكاف مضبوط.',
  'تطبيق سليم للإخفاء الحقيقي مع مراعاة مراتب الغنة وتفخيمها عند حروف الاستعلاء.',
  'أداء متميز في صفات الحروف، خاصة التفشي في الشين والاستطالة في الضاد.',
]

const HOMEWORK_NOTES = [
  'حفظ سورة النبأ من آية 1 إلى 20 مع تكرارها 5 مرات عبر المصحف المرتل.',
  'مراجعة سورة الملك كاملة وتسميعها لولي الأمر قبل الحلقة القادمة.',
  'تثبيت سورة الكهف من آية 1 إلى 15 وضبط أحكام القلقلة الواردة فيها.',
  'قراءة الحزب الثاني نظرًا مع مراعاة علامات الوقف والابتداء.',
  'الاستماع لتلاوة الشيخ الحصري لسورة الرحمن وتكرار الآيات الصعبة.',
]

async function enrichSeed() {
  console.log('🚀 Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'tartelah' })
  console.log('✅ Connected to MongoDB')

  const now = new Date()

  // ── 1. Load Core Collections ────────────────────────────────────────────────
  const admin = await User.findOne({ role: 'admin' }) || await User.findOne()
  let teachers = await User.find({ role: 'teacher' })
  let students = await User.find({ role: 'student' })
  const packages = await Package.find()

  if (!packages.length) {
    console.error('❌ No packages found. Please ensure basic packages exist first.')
    process.exit(1)
  }

  console.log(`📊 Found ${teachers.length} teachers, ${students.length} students, ${packages.length} packages in database.`)

  // ── 2. Add Distinguished Teachers If Not Already Present ────────────────────
  const newTeacherDefs = [
    {
      firstNameAr: 'عبد الرحمن',
      lastNameAr: 'السديسي',
      firstName: 'Abdulrahman',
      lastName: 'Al-Sudaisi',
      email: 'sheikh.sudais@tartelah.com',
      password: 'Teacher1234!',
      role: 'teacher',
      gender: 'male',
      phone: '+966509991101',
      specialization: 'إتقان التلاوة والتجويد وقراءات العشر',
      bioAr: 'إمام وخطيب، مجاز بالقراءات العشر الصغرى والكبرى، خبرة أكثر من 18 عاماً في تعليم القرآن الكريم وتخريج الحفظة.',
      salaryPerSession: 65,
      meetingLinks: [
        { provider: 'zoom', label: 'حلقات القراءات (Zoom)', link: 'https://zoom.us/j/7788990011' },
        { provider: 'meet', label: 'حلقات التدبر (Google Meet)', link: 'https://meet.google.com/sud-qran-aca' },
      ],
      isEmailVerified: true,
      isActive: true,
    },
    {
      firstNameAr: 'أحمد',
      lastNameAr: 'شاهين',
      firstName: 'Ahmed',
      lastName: 'Shaheen',
      email: 'sheikh.shaheen@tartelah.com',
      password: 'Teacher1234!',
      role: 'teacher',
      gender: 'male',
      phone: '+966509991102',
      specialization: 'تحفيظ القرآن الكريم وتثبيت المتشابهات',
      bioAr: 'خريج كلية القرآن الكريم بالجامعة الإسلامية، متخصص في المتشابهات القرآنية وضبط الحفظ للمتقدمين.',
      salaryPerSession: 50,
      meetingLinks: [
        { provider: 'zoom', label: 'الحلقة المباشرة', link: 'https://zoom.us/j/6655443322' },
      ],
      isEmailVerified: true,
      isActive: true,
    },
    {
      firstNameAr: 'أروى',
      lastNameAr: 'الشريف',
      firstName: 'Arwa',
      lastName: 'Al-Sharif',
      email: 'teacher.arwa@tartelah.com',
      password: 'Teacher1234!',
      role: 'teacher',
      gender: 'female',
      phone: '+966509991103',
      specialization: 'تحفيظ الأطفال والبراعم والقاعدة النورانية',
      bioAr: 'معلمة مجازة متخصصة في تأسيس الأطفال على القاعدة النورانية وتلقين قصار السور بأساليب تحفيزية حديثة.',
      salaryPerSession: 45,
      meetingLinks: [
        { provider: 'zoom', label: 'حلقة البراعم', link: 'https://zoom.us/j/5544332211' },
      ],
      isEmailVerified: true,
      isActive: true,
    },
    {
      firstNameAr: 'محمود',
      lastNameAr: 'الحصري',
      firstName: 'Mahmoud',
      lastName: 'Al-Hosary',
      email: 'sheikh.hosary@tartelah.com',
      password: 'Teacher1234!',
      role: 'teacher',
      gender: 'male',
      phone: '+966509991104',
      specialization: 'تصحيح التلاوة وضبط المخارج والصفات',
      bioAr: 'متخصص في علم الصوتيات والتجويد العملي وتصحيح نطق الحروف لجميع الأعمار.',
      salaryPerSession: 55,
      meetingLinks: [
        { provider: 'zoom', label: 'حلقة التجويد العملي', link: 'https://zoom.us/j/4433221100' },
      ],
      isEmailVerified: true,
      isActive: true,
    },
  ]

  for (const def of newTeacherDefs) {
    let existing = await User.findOne({ email: def.email })
    if (!existing) {
      existing = await User.create(def)
      console.log(`   ➕ Added teacher: ${def.firstNameAr} ${def.lastNameAr} (${def.email})`)
    }
  }

  // Refresh teacher list
  teachers = await User.find({ role: 'teacher', isActive: true })

  // ── 3. Add Additional Students If Needed ────────────────────────────────────
  const newStudentDefs = [
    { firstNameAr: 'حمزة', lastNameAr: 'المنصور', firstName: 'Hamza', lastName: 'Al-Mansour', email: 'hamza.student@tartelah.com', password: 'Student1234!', role: 'student', phone: '+966508882201', isEmailVerified: true, isActive: true },
    { firstNameAr: 'جنى', lastNameAr: 'العتيبي', firstName: 'Jana', lastName: 'Al-Otaibi', email: 'jana.student@tartelah.com', password: 'Student1234!', role: 'student', phone: '+966508882202', isEmailVerified: true, isActive: true },
    { firstNameAr: 'أنس', lastNameAr: 'الشهري', firstName: 'Anas', lastName: 'Al-Shehri', email: 'anas.student@tartelah.com', password: 'Student1234!', role: 'student', phone: '+966508882203', isEmailVerified: true, isActive: true },
    { firstNameAr: 'ريماس', lastNameAr: 'الحربي', firstName: 'Remas', lastName: 'Al-Harbi', email: 'remas.student@tartelah.com', password: 'Student1234!', role: 'student', phone: '+966508882204', isEmailVerified: true, isActive: true },
    { firstNameAr: 'زياد', lastNameAr: 'الغامدي', firstName: 'Ziyad', lastName: 'Al-Ghamdi', email: 'ziyad.student@tartelah.com', password: 'Student1234!', role: 'student', phone: '+966508882205', isEmailVerified: true, isActive: true },
  ]

  for (const def of newStudentDefs) {
    let existing = await User.findOne({ email: def.email })
    if (!existing) {
      existing = await User.create(def)
      console.log(`   ➕ Added student: ${def.firstNameAr} ${def.lastNameAr} (${def.email})`)
    }
  }

  // Refresh student list
  students = await User.find({ role: 'student', isActive: true })

  // ── 4. Setup Teacher Working Hours ──────────────────────────────────────────
  console.log('⏰ Configuring Teacher Working Hours...')
  let workingHoursCreated = 0
  for (const t of teachers) {
    const existing = await TeacherWorkingHours.findOne({ teacherId: t._id })
    if (!existing) {
      await TeacherWorkingHours.create({
        teacherId: t._id,
        days: [
          { dayOfWeek: 0, mode: 'custom', periods: [{ start: '16:00', end: '18:00' }, { start: '18:30', end: '21:30' }] }, // Sunday
          { dayOfWeek: 1, mode: 'custom', periods: [{ start: '16:00', end: '18:00' }, { start: '18:30', end: '21:30' }] }, // Monday
          { dayOfWeek: 2, mode: 'custom', periods: [{ start: '16:00', end: '18:00' }, { start: '18:30', end: '21:30' }] }, // Tuesday
          { dayOfWeek: 3, mode: 'custom', periods: [{ start: '16:00', end: '18:00' }, { start: '18:30', end: '21:30' }] }, // Wednesday
          { dayOfWeek: 4, mode: 'custom', periods: [{ start: '15:00', end: '19:00' }] },                                      // Thursday
          { dayOfWeek: 5, mode: 'unavailable', periods: [] },                                                                   // Friday
          { dayOfWeek: 6, mode: 'custom', periods: [{ start: '10:00', end: '13:00' }, { start: '16:00', end: '20:00' }] }, // Saturday
        ],
        updatedBy: admin._id,
      })
      workingHoursCreated++
    }
  }
  console.log(`   ✓ Configured working hours for ${workingHoursCreated} teachers.`)

  // ── 5. Setup Lesson Wallets for Students ────────────────────────────────────
  console.log('💳 Configuring Lesson Wallets & Transactions...')
  let walletsEnriched = 0
  for (const s of students) {
    let wallet = await LessonWallet.findOne({ studentId: s._id })
    if (!wallet) {
      wallet = await LessonWallet.create({
        studentId: s._id,
        totalPurchased: 16,
        totalUsed: 5,
        bonusLessons: 1,
        remaining: 12,
        status: 'active',
      })
      await LessonTransaction.create({
        walletId: wallet._id,
        studentId: s._id,
        type: 'opening_balance',
        amount: 16,
        balanceAfter: 16,
        reason: 'رصيد الافتتاح من الاشتراك الأول في باقة المتقدم',
        performedByRole: 'admin',
        performedBy: admin._id,
        metadata: { packageTotal: 16, lessonsUsedAtOpening: 0, lessonsRemainingAtOpening: 16 },
      })
      walletsEnriched++
    }
  }
  console.log(`   ✓ Configured wallets for ${walletsEnriched} students.`)

  // ── 6. Setup Historical Subscriptions Across Date Ranges ────────────────────
  console.log('📈 Seeding Historical Subscriptions for Reports & Trends...')
  let subCount = 0

  const createSubAt = async (student, teacher, pkg, date, status = 'active') => {
    const endDate = new Date(date.getTime() + 30 * 86400000)
    const sub = await Subscription.create({
      studentId: student._id,
      teacherId: teacher._id,
      packageId: pkg._id,
      packageNameAr: pkg.nameAr,
      startDate: date,
      endDate,
      totalSessions: pkg.sessionsPerMonth,
      sessionsRemaining: Math.max(0, pkg.sessionsPerMonth - randInt(2, 6)),
      status,
      amountPaid: pkg.price,
      currency: 'SAR',
      createdAt: date,
      updatedAt: date,
    })
    subCount++
    return sub
  }

  // Today
  for (let i = 0; i < 2; i++) {
    const s = rand(students); const t = rand(teachers); const p = rand(packages)
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9 + i * 3, 15)
    await createSubAt(s, t, p, d)
  }
  // Yesterday
  for (let i = 0; i < 2; i++) {
    const s = rand(students); const t = rand(teachers); const p = rand(packages)
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 11 + i * 2, 30)
    await createSubAt(s, t, p, d)
  }
  // This Week (3, 4 days ago)
  for (let i = 0; i < 4; i++) {
    const s = rand(students); const t = rand(teachers); const p = rand(packages)
    const d = new Date(now.getTime() - (2 + i) * 86400000)
    await createSubAt(s, t, p, d)
  }
  // Earlier This Month (6-12 days ago)
  for (let i = 0; i < 6; i++) {
    const s = rand(students); const t = rand(teachers); const p = rand(packages)
    const d = new Date(now.getTime() - (6 + i) * 86400000)
    await createSubAt(s, t, p, d)
  }
  // Last Month (Month - 1)
  for (let i = 0; i < 10; i++) {
    const s = rand(students); const t = rand(teachers); const p = rand(packages)
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 2 + i * 2, 14, 0)
    await createSubAt(s, t, p, d, 'expired')
  }
  // Months -2, -3, -4, -5 for trend graphs
  for (let m = 2; m <= 5; m++) {
    for (let i = 0; i < 6; i++) {
      const s = rand(students); const t = rand(teachers); const p = rand(packages)
      const d = new Date(now.getFullYear(), now.getMonth() - m, 5 + i * 4, 16, 0)
      await createSubAt(s, t, p, d, 'expired')
    }
  }
  console.log(`   ✓ Seeded ${subCount} subscriptions across the last 6 months.`)

  // ── 7. Operations Center: Specific Sessions for TODAY ───────────────────────
  console.log('⚡ Seeding Operations Center Sessions for TODAY...')
  let opsSessionsCount = 0

  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth()
  const todayDate = now.getDate()

  // A. Live Now (status: ongoing, scheduled 15 mins ago, duration: 60)
  const ongoingTeacher1 = teachers[0]
  const ongoingTeacher2 = teachers[1] || teachers[0]
  const liveSession1 = await Session.create({
    studentId: students[0]._id,
    teacherId: ongoingTeacher1._id,
    titleAr: `حلقة القرآن الكريم - ${students[0].firstNameAr}`,
    scheduledAt: new Date(now.getTime() - 15 * 60000),
    durationMinutes: 60,
    status: 'ongoing',
    meetingLink: ongoingTeacher1.meetingLinks?.[0]?.link || 'https://zoom.us/j/9900112233',
    meetingProvider: 'zoom',
    teacherStartedAt: new Date(now.getTime() - 16 * 60000),
    teacherAttendanceStatus: 'on_time',
    payrollStatus: 'payable',
    teacherNotes: 'الحلقة جارية حالياً ومستوى الطالب ممتاز.',
  })
  opsSessionsCount++

  const liveSession2 = await Session.create({
    studentId: students[1]._id,
    teacherId: ongoingTeacher2._id,
    titleAr: `حلقة التجويد العملي - ${students[1].firstNameAr}`,
    scheduledAt: new Date(now.getTime() - 25 * 60000),
    durationMinutes: 45,
    status: 'ongoing',
    meetingLink: ongoingTeacher2.meetingLinks?.[0]?.link || 'https://zoom.us/j/8811223344',
    meetingProvider: 'zoom',
    teacherStartedAt: new Date(now.getTime() - 24 * 60000),
    teacherAttendanceStatus: 'on_time',
    payrollStatus: 'payable',
  })
  opsSessionsCount++

  // B. Starting Soon (scheduled in 25 and 45 minutes)
  const startingSoon1 = await Session.create({
    studentId: students[2]._id,
    teacherId: teachers[2] ? teachers[2]._id : teachers[0]._id,
    titleAr: `حلقة الحفظ والمراجعة - ${students[2].firstNameAr}`,
    scheduledAt: new Date(now.getTime() + 25 * 60000),
    durationMinutes: 45,
    status: 'scheduled',
    meetingLink: 'https://zoom.us/j/7722334455',
    meetingProvider: 'zoom',
    teacherAttendanceStatus: 'pending',
    payrollStatus: 'pending',
  })
  opsSessionsCount++

  const startingSoon2 = await Session.create({
    studentId: students[3]._id,
    teacherId: teachers[3] ? teachers[3]._id : teachers[0]._id,
    titleAr: `حلقة القاعدة النورانية - ${students[3].firstNameAr}`,
    scheduledAt: new Date(now.getTime() + 45 * 60000),
    durationMinutes: 30,
    status: 'scheduled',
    meetingLink: 'https://meet.google.com/nur-qran-aca',
    meetingProvider: 'meet',
    teacherAttendanceStatus: 'pending',
    payrollStatus: 'pending',
  })
  opsSessionsCount++

  // C. Missing Link (Starting in 30 minutes, without meetingLink)
  const missingLinkSession = await Session.create({
    studentId: students[4]._id,
    teacherId: teachers[1]._id,
    titleAr: `حلقة تصحيح التلاوة - ${students[4].firstNameAr}`,
    scheduledAt: new Date(now.getTime() + 30 * 60000),
    durationMinutes: 45,
    status: 'scheduled',
    meetingLink: '',
    meetingProvider: 'zoom',
    teacherAttendanceStatus: 'pending',
    payrollStatus: 'pending',
    notes: 'تنبيه: المعلم لم يقم بإرفاق رابط الزووم بعد.',
  })
  opsSessionsCount++

  // D. Missing Check-In (Scheduled 10 minutes ago, teacher not yet checked in)
  const missingCheckInSession = await Session.create({
    studentId: students[5]._id,
    teacherId: teachers[2] ? teachers[2]._id : teachers[0]._id,
    titleAr: `حلقة التسميع المباشر - ${students[5].firstNameAr}`,
    scheduledAt: new Date(now.getTime() - 10 * 60000),
    durationMinutes: 45,
    status: 'scheduled',
    meetingLink: 'https://zoom.us/j/5511223344',
    meetingProvider: 'zoom',
    teacherAttendanceStatus: 'pending',
    payrollStatus: 'pending',
    notes: 'المعلم تأخر عن تسجيل الدخول المباشر.',
  })
  opsSessionsCount++

  // E. Late Teacher (Scheduled earlier today, teacher joined 14 minutes late)
  const lateTeacherSession = await Session.create({
    studentId: students[6]._id,
    teacherId: teachers[0]._id,
    titleAr: `حلقة التجويد المتقدم - ${students[6].firstNameAr}`,
    scheduledAt: new Date(todayYear, todayMonth, todayDate, 8, 30),
    durationMinutes: 60,
    status: 'completed',
    completedAt: new Date(todayYear, todayMonth, todayDate, 9, 35),
    meetingLink: 'https://zoom.us/j/1234567890',
    meetingProvider: 'zoom',
    teacherAttendanceStatus: 'late',
    teacherLateMinutes: 14,
    teacherStartedAt: new Date(todayYear, todayMonth, todayDate, 8, 44),
    payrollStatus: 'pending_review',
    payrollStatusReason: 'تأخر المعلم 14 دقيقة عن موعد بدء الحصة',
    attendanceFinalizedAt: new Date(todayYear, todayMonth, todayDate, 9, 40),
  })
  await Attendance.create({
    sessionId: lateTeacherSession._id,
    studentId: students[6]._id,
    teacherId: teachers[0]._id,
    status: 'present',
    notes: 'حضر الطالب في الموعد المحدد.',
    arrivalTime: new Date(todayYear, todayMonth, todayDate, 8, 30),
    recordedAt: new Date(todayYear, todayMonth, todayDate, 8, 30),
    isFinalized: true,
    finalizedAt: new Date(todayYear, todayMonth, todayDate, 9, 40),
    createdAt: new Date(todayYear, todayMonth, todayDate, 8, 30),
  })
  opsSessionsCount++

  // F. Attendance Pending Finalization (Session completed earlier today)
  const attPendingSession = await Session.create({
    studentId: students[7]._id,
    teacherId: teachers[1]._id,
    titleAr: `حلقة قصار السور - ${students[7].firstNameAr}`,
    scheduledAt: new Date(todayYear, todayMonth, todayDate, 9, 0),
    durationMinutes: 45,
    status: 'completed',
    completedAt: new Date(todayYear, todayMonth, todayDate, 9, 50),
    meetingLink: 'https://zoom.us/j/9876543210',
    teacherAttendanceStatus: 'on_time',
    teacherStartedAt: new Date(todayYear, todayMonth, todayDate, 8, 59),
    payrollStatus: 'payable',
    attendanceFinalizedAt: null,
  })
  await Attendance.create({
    sessionId: attPendingSession._id,
    studentId: students[7]._id,
    teacherId: teachers[1]._id,
    status: 'present',
    notes: 'تم تقديم الحصة بانتظام وجارٍ اعتماد الحضور.',
    recordedAt: new Date(todayYear, todayMonth, todayDate, 9, 50),
    isFinalized: false,
    createdAt: new Date(todayYear, todayMonth, todayDate, 9, 0),
  })
  opsSessionsCount++

  // G. Recently Completed with Full Quran Report & Evaluation
  const completedTodaySession = await Session.create({
    studentId: students[8]._id,
    teacherId: teachers[2] ? teachers[2]._id : teachers[0]._id,
    titleAr: `حلقة حفظ سورة الملك - ${students[8].firstNameAr}`,
    scheduledAt: new Date(todayYear, todayMonth, todayDate, 7, 0),
    durationMinutes: 60,
    status: 'completed',
    completedAt: new Date(todayYear, todayMonth, todayDate, 8, 2),
    meetingLink: 'https://zoom.us/j/4455667788',
    teacherAttendanceStatus: 'on_time',
    teacherStartedAt: new Date(todayYear, todayMonth, todayDate, 6, 58),
    payrollStatus: 'payable',
    attendanceFinalizedAt: new Date(todayYear, todayMonth, todayDate, 8, 10),
  })
  await Attendance.create({
    sessionId: completedTodaySession._id,
    studentId: students[8]._id,
    teacherId: completedTodaySession.teacherId,
    status: 'present',
    arrivalTime: new Date(todayYear, todayMonth, todayDate, 7, 0),
    recordedAt: new Date(todayYear, todayMonth, todayDate, 8, 2),
    isFinalized: true,
    finalizedAt: new Date(todayYear, todayMonth, todayDate, 8, 10),
    createdAt: new Date(todayYear, todayMonth, todayDate, 7, 0),
  })
  opsSessionsCount++

  // H. Cancelled Session Today
  const cancelledTodaySession = await Session.create({
    studentId: students[9]._id,
    teacherId: teachers[0]._id,
    titleAr: `حلقة التلاوة والتجويد - ${students[9].firstNameAr}`,
    scheduledAt: new Date(todayYear, todayMonth, todayDate, 10, 0),
    durationMinutes: 45,
    status: 'cancelled',
    cancelledAt: new Date(todayYear, todayMonth, todayDate, 8, 0),
    cancelReason: 'عذر طارئ لظرف صحي للطالب تم إبلاغ الإدارة به مسبقاً',
    cancelledBy: admin._id,
    teacherAttendanceStatus: 'excused',
    payrollStatus: 'excluded',
  })
  opsSessionsCount++

  // I. No Show Session Today
  const noShowSession = await Session.create({
    studentId: students[10]._id,
    teacherId: teachers[1]._id,
    titleAr: `حلقة المراجعة والتثبيت - ${students[10].firstNameAr}`,
    scheduledAt: new Date(todayYear, todayMonth, todayDate, 6, 30),
    durationMinutes: 45,
    status: 'no_show',
    teacherAttendanceStatus: 'on_time',
    teacherStartedAt: new Date(todayYear, todayMonth, todayDate, 6, 28),
    payrollStatus: 'payable',
    notes: 'المعلم حضر وانتظر في غرفة الزووم لمدة 15 دقيقة دون حضور الطالب.',
    attendanceFinalizedAt: new Date(todayYear, todayMonth, todayDate, 7, 0),
  })
  await Attendance.create({
    sessionId: noShowSession._id,
    studentId: students[10]._id,
    teacherId: teachers[1]._id,
    status: 'absent',
    notes: 'غياب الطالب دون عذر مسبق.',
    recordedAt: new Date(todayYear, todayMonth, todayDate, 7, 0),
    isFinalized: true,
    finalizedAt: new Date(todayYear, todayMonth, todayDate, 7, 0),
    createdAt: new Date(todayYear, todayMonth, todayDate, 6, 30),
  })
  opsSessionsCount++

  console.log(`   ✓ Seeded ${opsSessionsCount} high-fidelity Operations Center sessions for TODAY.`)

  // ── 8. Seed Historical Sessions, Reports & Evaluations ─────────────────────
  console.log('📖 Seeding Quran Session Reports, Evaluations & Historical Sessions...')
  let reportsCreated = 0
  let evalsCreated = 0
  let histSessionsCount = 0

  const cohorts = [
    { label: 'yesterday', daysBack: 1, count: 6 },
    { label: 'this_week', daysBackMin: 2, daysBackMax: 5, count: 12 },
    { label: 'this_month', daysBackMin: 6, daysBackMax: 15, count: 20 },
    { label: 'last_month', daysBackMin: 25, daysBackMax: 45, count: 35 },
  ]

  for (const cohort of cohorts) {
    for (let i = 0; i < cohort.count; i++) {
      const student = rand(students)
      const teacher = rand(teachers)
      const surah = rand(SURAHS)
      const daysBack = cohort.daysBack !== undefined
        ? cohort.daysBack
        : randInt(cohort.daysBackMin, cohort.daysBackMax)
      const sessionDate = new Date(now.getTime() - daysBack * 86400000)
      sessionDate.setHours(randInt(14, 21), rand([0, 15, 30, 45]), 0, 0)

      const isCancelled = i === cohort.count - 1
      const isLateTeacher = i === 1
      const isStudentAbsent = i === 2

      const session = await Session.create({
        studentId: student._id,
        teacherId: teacher._id,
        titleAr: `حلقة ${surah.name} - ${student.firstNameAr}`,
        scheduledAt: sessionDate,
        durationMinutes: rand([30, 45, 60]),
        status: isCancelled ? 'cancelled' : 'completed',
        completedAt: isCancelled ? null : new Date(sessionDate.getTime() + 45 * 60000),
        cancelledAt: isCancelled ? new Date(sessionDate.getTime() - 2 * 3600000) : null,
        cancelReason: isCancelled ? 'اعتذار مسبق وتنسيق موعد تعويضي' : null,
        meetingLink: teacher.meetingLinks?.[0]?.link || 'https://zoom.us/j/1234567890',
        meetingProvider: 'zoom',
        teacherAttendanceStatus: isCancelled ? 'excused' : (isLateTeacher ? 'late' : 'on_time'),
        teacherLateMinutes: isLateTeacher ? randInt(8, 16) : 0,
        teacherStartedAt: new Date(sessionDate.getTime() + (isLateTeacher ? 10 * 60000 : -2 * 60000)),
        payrollStatus: isCancelled ? 'excluded' : (isLateTeacher ? 'pending_review' : 'payable'),
        payrollStatusReason: isLateTeacher ? 'تأخر عن الموعد لأكثر من 5 دقائق' : null,
        attendanceFinalizedAt: isCancelled ? null : new Date(sessionDate.getTime() + 60 * 60000),
        createdAt: sessionDate,
      })
      histSessionsCount++

      if (isCancelled) continue

      // Student Attendance
      const studentStatus = isStudentAbsent ? 'absent' : (i % 5 === 0 ? 'late' : 'present')
      await Attendance.create({
        sessionId: session._id,
        studentId: student._id,
        teacherId: teacher._id,
        status: studentStatus,
        notes: studentStatus === 'present' ? 'حضور متميز والتزام بالوقت.' : (studentStatus === 'late' ? 'تأخر 5 دقائق لعطل تقني.' : 'غياب مع إشعار متأخر.'),
        recordedAt: new Date(sessionDate.getTime() + 45 * 60000),
        isFinalized: true,
        finalizedAt: new Date(sessionDate.getTime() + 60 * 60000),
        createdAt: sessionDate,
      })

      if (studentStatus === 'absent') continue

      // Evaluation
      const feedback = rand(EVALUATION_FEEDBACKS)
      const score = randInt(8, 10)
      const evalDoc = await Evaluation.create({
        studentId: student._id,
        teacherId: teacher._id,
        sessionId: session._id,
        type: rand(['tajweed', 'hifz', 'nazra', 'general']),
        score,
        notesAr: feedback.notes,
        strengths: feedback.strengths,
        improvements: feedback.improvements,
        isSharedWithStudent: true,
        createdAt: sessionDate,
      })
      evalsCreated++

      // Quran Session Report
      const reportStatuses = ['approved', 'approved', 'approved', 'submitted', 'correction_requested']
      const reportStatus = reportStatuses[i % reportStatuses.length]
      await QuranSessionReport.create({
        sessionId: session._id,
        studentId: student._id,
        teacherId: teacher._id,
        evaluationId: evalDoc._id,
        tajweedNotes: rand(TAJWEED_NOTES),
        interactiveActivity: 'تطبيق عملي لأحكام التجويد من خلال التلاوة التبادلية بين المعلم والطالب.',
        nextSessionHomework: rand(HOMEWORK_NOTES),
        teacherNotes: 'الطالب يتجاوب بشكل ممتاز مع التوجيهات ويظهر شغفاً حقيقياً بكتاب الله.',
        referenceLink: 'https://quran.com',
        status: reportStatus,
        correctionReason: reportStatus === 'correction_requested' ? 'يرجى تدقيق عدد الآيات المسمعة وتحديد موعد التسميع القادم.' : null,
        submittedAt: new Date(sessionDate.getTime() + 50 * 60000),
        reviewedBy: reportStatus === 'approved' ? admin._id : null,
        reviewedAt: reportStatus === 'approved' ? new Date(sessionDate.getTime() + 120 * 60000) : null,
        createdBy: teacher._id,
        createdAt: sessionDate,
      })
      reportsCreated++

      // Linked Memorization & Revision line items
      const fromAyah = randInt(1, Math.max(1, surah.count - 15))
      const toAyah = Math.min(surah.count, fromAyah + randInt(5, 15))
      await Memorization.create({
        studentId: student._id,
        teacherId: teacher._id,
        sessionId: session._id,
        surahNumber: surah.number,
        fromAyah,
        toAyah,
        quality: rand(['excellent', 'excellent', 'good']),
        teacherNotes: 'تسميع جيد جداً مع مراعاة أحكام المد والقصر.',
        recordedAt: sessionDate,
        createdAt: sessionDate,
      })

      const revSurah = rand(SURAHS)
      await Revision.create({
        studentId: student._id,
        teacherId: teacher._id,
        sessionId: session._id,
        surahNumber: revSurah.number,
        fromAyah: 1,
        toAyah: Math.min(revSurah.count, 20),
        quality: rand(['excellent', 'good']),
        teacherNotes: 'مراجعة متقنة ومثبتة.',
        recordedAt: sessionDate,
        createdAt: sessionDate,
      })
    }
  }

  console.log(`   ✓ Created ${histSessionsCount} historical sessions.`)
  console.log(`   ✓ Created ${evalsCreated} student evaluations.`)
  console.log(`   ✓ Created ${reportsCreated} detailed Quran Session Reports.`)

  // ── 9. Seed Monthly Teacher Reports ─────────────────────────────────────────
  console.log('📑 Seeding Monthly Teacher Reports...')
  let monthlyReportsCreated = 0

  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentPeriodKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15)
  const lastYear = lastMonthDate.getFullYear()
  const lastMonth = lastMonthDate.getMonth() + 1
  const lastPeriodKey = `${lastYear}-${String(lastMonth).padStart(2, '0')}`

  for (const t of teachers) {
    // Last month report (approved snapshot)
    const existingLast = await MonthlyTeacherReport.findOne({ teacherId: t._id, periodKey: lastPeriodKey })
    if (!existingLast) {
      const scheduled = randInt(24, 36)
      const completed = scheduled - randInt(1, 3)
      const cancelled = scheduled - completed
      const gross = completed * (t.salaryPerSession || 45)
      await MonthlyTeacherReport.create({
        teacherId: t._id,
        year: lastYear,
        month: lastMonth,
        periodKey: lastPeriodKey,
        status: 'approved',
        scheduledSessions: scheduled,
        conductedSessions: completed,
        completedSessions: completed,
        cancelledSessions: cancelled,
        postponedSessions: 0,
        submittedReports: completed,
        missingReports: 0,
        assignedStudentsCount: randInt(6, 12),
        attendanceSummary: {
          onTime: completed - randInt(0, 2),
          late: randInt(0, 2),
          absent: 0,
          excused: cancelled,
          completionRate: Math.round((completed / scheduled) * 100),
          punctualityRate: 95,
        },
        grossEntitlement: gross,
        bonusesTotal: 100,
        deductionsTotal: 0,
        netPayable: gross + 100,
        currency: 'SAR',
        teacherNotes: 'الحمد لله تم إنجاز الخطة المقررة للطلاب على أكمل وجه مع تقدم واضح في مستوى التجويد.',
        recommendations: 'نقترح تخصيص مسابقة شهرية لتحفيز الطلاب على المراجعة الدورية.',
        adminNotes: 'أداء متميز والتزام تام بالمواعيد وتقارير الحصص.',
        submittedAt: new Date(lastYear, lastMonth, 1),
        reviewedBy: admin._id,
        reviewedAt: new Date(lastYear, lastMonth, 2),
        approvedAt: new Date(lastYear, lastMonth, 3),
        createdAt: new Date(lastYear, lastMonth, 1),
      })
      monthlyReportsCreated++
    }

    // Current month report (submitted/draft)
    const existingCurrent = await MonthlyTeacherReport.findOne({ teacherId: t._id, periodKey: currentPeriodKey })
    if (!existingCurrent) {
      const scheduled = randInt(12, 20)
      const completed = scheduled - randInt(0, 2)
      const gross = completed * (t.salaryPerSession || 45)
      await MonthlyTeacherReport.create({
        teacherId: t._id,
        year: currentYear,
        month: currentMonth,
        periodKey: currentPeriodKey,
        status: 'submitted',
        scheduledSessions: scheduled,
        conductedSessions: completed,
        completedSessions: completed,
        cancelledSessions: scheduled - completed,
        postponedSessions: 0,
        submittedReports: completed,
        missingReports: 0,
        assignedStudentsCount: randInt(6, 10),
        attendanceSummary: {
          onTime: completed - 1,
          late: 1,
          absent: 0,
          excused: scheduled - completed,
          completionRate: Math.round((completed / scheduled) * 100),
          punctualityRate: 92,
        },
        grossEntitlement: gross,
        bonusesTotal: 0,
        deductionsTotal: 0,
        netPayable: gross,
        currency: 'SAR',
        teacherNotes: 'الشهر يسير بصورة ممتازة والطلاب منتظمون في الحلقات.',
        submittedAt: now,
        createdAt: now,
      })
      monthlyReportsCreated++
    }
  }
  console.log(`   ✓ Seeded ${monthlyReportsCreated} Monthly Teacher Reports.`)

  // ── 10. Seed Assignment Requests (إضافة وإسناد) ──────────────────────────────
  console.log('🤝 Seeding Assignment Requests...')
  let assignmentsCreated = 0

  const assignmentData = [
    {
      studentId: students[0]._id,
      teacherId: teachers[0]._id,
      studentType: 'existing',
      studentAge: 12,
      specialization: 'التجويد',
      lessonDurationMinutes: 45,
      schedule: {
        days: [{ dayOfWeek: 0, time: '17:00' }, { dayOfWeek: 2, time: '17:00' }],
        startDate: new Date(now.getTime() + 86400000),
        frequency: 'weekly',
      },
      status: 'pending_teacher_approval',
      adminNotes: 'الطالب يرغب بالتركيز على مخارج الحروف والمدود.',
      generatedMessage: 'السلام عليكم ورحمة الله، تم إسناد الطالب عبدالله إليكم لحصص التجويد يومي الأحد والثلاثاء الساعة 17:00.',
      sentMessage: 'السلام عليكم ورحمة الله، تم إسناد الطالب عبدالله إليكم لحصص التجويد يومي الأحد والثلاثاء الساعة 17:00.',
    },
    {
      studentId: students[1]._id,
      teacherId: teachers[1]._id,
      studentType: 'new',
      studentAge: 9,
      specialization: 'الحفظ',
      lessonDurationMinutes: 30,
      schedule: {
        days: [{ dayOfWeek: 1, time: '18:00' }, { dayOfWeek: 3, time: '18:00' }],
        startDate: new Date(now.getTime() + 2 * 86400000),
        frequency: 'weekly',
      },
      status: 'pending_teacher_approval',
      adminNotes: 'طالبة مبتدئة، الأفضل البدء من سورة الناس.',
      generatedMessage: 'السلام عليكم ورحمة الله، تم إسناد الطالبة نورة إليكم لحصص الحفظ يومي الإثنين والأربعاء الساعة 18:00.',
      sentMessage: 'السلام عليكم ورحمة الله، تم إسناد الطالبة نورة إليكم لحصص الحفظ يومي الإثنين والأربعاء الساعة 18:00.',
    },
    {
      studentId: students[2]._id,
      teacherId: teachers[2] ? teachers[2]._id : teachers[0]._id,
      studentType: 'existing',
      studentAge: 15,
      specialization: 'القرآن الكريم',
      lessonDurationMinutes: 60,
      schedule: {
        days: [{ dayOfWeek: 6, time: '16:00' }, { dayOfWeek: 2, time: '16:00' }],
        startDate: new Date(now.getTime() + 86400000),
        frequency: 'weekly',
      },
      status: 'time_change_requested',
      teacherResponse: {
        type: 'time_change',
        reason: 'تعارض مع حلقة جماعية قائمة في نفس التوقيت',
        proposedSchedule: {
          days: [{ dayOfWeek: 6, time: '17:30' }, { dayOfWeek: 2, time: '17:30' }],
        },
        note: 'أقترح تأخير الموعد ساعة ونصف ليتناسب مع جدول الحلقات.',
        respondedAt: new Date(now.getTime() - 2 * 3600000),
      },
      adminNotes: 'طلب المعلم تعديل الموعد لوجود تعارض.',
      generatedMessage: 'إسناد حلقة قرآن كريم للطالب يوسف.',
      sentMessage: 'إسناد حلقة قرآن كريم للطالب يوسف.',
    },
    {
      studentId: students[3]._id,
      teacherId: teachers[0]._id,
      studentType: 'existing',
      studentAge: 14,
      specialization: 'التجويد',
      lessonDurationMinutes: 45,
      schedule: {
        days: [{ dayOfWeek: 1, time: '16:30' }],
        startDate: new Date(now.getTime() - 7 * 86400000),
        frequency: 'weekly',
      },
      status: 'completed',
      adminNotes: 'تم الاعتماد وبدء الحصص بانتظام.',
      generatedMessage: 'إسناد حلقة التجويد للطالبة فاطمة.',
      sentMessage: 'إسناد حلقة التجويد للطالبة فاطمة.',
    },
  ]

  for (const item of assignmentData) {
    await AssignmentRequest.create(item)
    assignmentsCreated++
  }
  console.log(`   ✓ Seeded ${assignmentsCreated} Assignment Requests.`)

  // ── 11. Seed Enrollment Requests ────────────────────────────────────────────
  console.log('📝 Seeding Enrollment Requests (طلبات التسجيل)...')
  let enrollmentsCreated = 0

  const enrollmentData = [
    {
      studentId: students[4]._id,
      packageId: packages[0]._id,
      status: 'pending',
      paymentMethod: 'bank_transfer',
      paymentReference: 'TRX-99882211',
      amount: packages[0].price,
      studentNotes: 'تم تحويل الرسوم عبر بنك الراجحي، مرفق إيصال السداد.',
      adminNotes: 'قيد مراجعة التحويل البنكي.',
    },
    {
      studentId: students[5]._id,
      packageId: packages[1]._id,
      status: 'pending',
      paymentMethod: 'card',
      paymentReference: 'PAY-VISA-5544',
      amount: packages[1].price,
      studentNotes: 'أرغب بالدراسة في الفترة المسائية بعد صلاة المغرب.',
    },
    {
      studentId: students[6]._id,
      packageId: packages[2]._id,
      status: 'under_review',
      paymentMethod: 'bank_transfer',
      paymentReference: 'TRX-33221100',
      amount: packages[2].price,
      studentNotes: 'طالب متميز أتم حفظ 10 أجزاء ويرغب بمعلم متقن للقراءات.',
      adminNotes: 'جارٍ التنسيق لاختيار الشيخ الأنسب لمستوى الطالب.',
    },
    {
      studentId: students[7]._id,
      packageId: packages[1]._id,
      status: 'approved',
      paymentMethod: 'card',
      paymentReference: 'PAY-MADA-7788',
      amount: packages[1].price,
      reviewedBy: admin._id,
      reviewedAt: new Date(now.getTime() - 24 * 3600000),
      adminNotes: 'تم تأكيد الدفع وإسناد الطالب للشيخ المعلم بنجاح.',
    },
  ]

  for (const item of enrollmentData) {
    await EnrollmentRequest.create(item)
    enrollmentsCreated++
  }
  console.log(`   ✓ Seeded ${enrollmentsCreated} Enrollment Requests.`)

  console.log('')
  console.log('══════════════════════════════════════════════════════════════════')
  console.log('🎉 ENRICHMENT SEEDING COMPLETED SUCCESSFULLY!')
  console.log('══════════════════════════════════════════════════════════════════')
  console.log(`✓ Active Teachers:              ${teachers.length}`)
  console.log(`✓ Active Students:              ${students.length}`)
  console.log(`✓ New Subscriptions:            ${subCount}`)
  console.log(`✓ Operations Center Today:      ${opsSessionsCount} sessions`)
  console.log(`✓ Historical Sessions:          ${histSessionsCount} sessions`)
  console.log(`✓ Detailed Quran Reports:       ${reportsCreated} reports`)
  console.log(`✓ Student Evaluations:          ${evalsCreated} evaluations`)
  console.log(`✓ Monthly Teacher Reports:      ${monthlyReportsCreated} reports`)
  console.log(`✓ Assignment Requests:          ${assignmentsCreated} requests`)
  console.log(`✓ Enrollment Requests:          ${enrollmentsCreated} requests`)
  console.log('══════════════════════════════════════════════════════════════════')
}

enrichSeed()
  .then(async () => {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB. Exiting cleanly.')
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('❌ Enrichment failed:', err)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  })
