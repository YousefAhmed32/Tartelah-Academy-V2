require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')

const User = require('../models/User')
const Course = require('../models/Course')
const Package = require('../models/Package')
const Subscription = require('../models/Subscription')
const Session = require('../models/Session')
const Attendance = require('../models/Attendance')
const Evaluation = require('../models/Evaluation')
const Homework = require('../models/Homework')
const Memorization = require('../models/Memorization')
const Revision = require('../models/Revision')
const Notification = require('../models/Notification')
const EnrollmentRequest = require('../models/EnrollmentRequest')
const ScheduleRule = require('../models/ScheduleRule')
const Testimonial = require('../models/Testimonial')
const FAQ = require('../models/FAQ')
const Article = require('../models/Article')
const ArticleCategory = require('../models/ArticleCategory')
const AcademySettings = require('../models/AcademySettings')
const SuccessStory = require('../models/SuccessStory')
const ContactMessage = require('../models/ContactMessage')
const AuditLog = require('../models/AuditLog')

// ── Small deterministic helpers (no new dependency — manual Arabic pools) ────
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, n)
const daysFromNow = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000)

const MALE_FIRST = ['محمد', 'أحمد', 'عبدالله', 'يوسف', 'خالد', 'إبراهيم', 'عمر', 'سعد', 'فيصل', 'ماجد']
const MALE_LAST = ['العمري', 'السلمي', 'المطيري', 'الغامدي', 'الحربي', 'الزهراني', 'القحطاني', 'الدوسري']
const FEMALE_FIRST = ['فاطمة', 'نورة', 'سارة', 'مريم', 'هند', 'ريم', 'أمل', 'لجين', 'دانة', 'جواهر']
const FEMALE_LAST = ['الزهراني', 'القحطاني', 'العتيبي', 'الشمري', 'البقمي', 'الحربي', 'العنزي', 'الرشيدي']

function makeUser(role, gender, i) {
  const firstPool = gender === 'female' ? FEMALE_FIRST : MALE_FIRST
  const lastPool = gender === 'female' ? FEMALE_LAST : MALE_LAST
  const firstNameAr = rand(firstPool)
  const lastNameAr = rand(lastPool)
  const en = { male: ['Mohammed', 'Ahmed', 'Abdullah', 'Yousef', 'Khaled'], female: ['Fatima', 'Noura', 'Sara', 'Mariam', 'Hind'] }
  return {
    firstNameAr, lastNameAr,
    firstName: rand(en[gender === 'female' ? 'female' : 'male']),
    lastName: 'Al-' + lastNameAr.replace('ال', ''),
    email: `${role}${i}@tartelah.com`,
    password: role === 'admin' ? 'Admin1234!' : role === 'teacher' ? 'Teacher1234!' : 'Student1234!',
    role,
    gender: role === 'teacher' ? gender : undefined,
    phone: `+9665${randInt(10000000, 99999999)}`,
    isEmailVerified: true,
    isActive: i % 17 !== 0, // sprinkle a couple of inactive accounts for admin activate/deactivate testing
  }
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'tartelah' })
  console.log('✅ Connected to MongoDB')

  // ── Clear existing data ──────────────────────────────────────────────────────
  const collections = [User, Course, Package, Subscription, Session, Attendance,
    Evaluation, Homework, Memorization, Revision, Notification, EnrollmentRequest,
    ScheduleRule, Testimonial, FAQ, Article, ArticleCategory, AcademySettings, SuccessStory,
    ContactMessage, AuditLog]
  for (const Model of collections) await Model.deleteMany({})
  console.log('🗑️  Cleared all collections')

  // ── Packages ────────────────────────────────────────────────────────────────
  const packages = await Package.insertMany([
    { nameAr: 'باقة الأساس', name: 'Basic', descriptionAr: 'مثالية للمبتدئين في رحلة حفظ القرآن الكريم', price: 299, durationDays: 30, sessionsPerMonth: 8, sortOrder: 1, featuresAr: ['8 حصص شهرياً', 'متابعة الحفظ', 'تقارير دورية', 'دعم عبر الواتساب'] },
    { nameAr: 'باقة المتقدم', name: 'Standard', descriptionAr: 'للطلاب الجادين في إتقان أحكام التجويد', price: 499, durationDays: 30, sessionsPerMonth: 16, isPopular: true, sortOrder: 2, featuresAr: ['16 حصة شهرياً', 'متابعة الحفظ والتجويد', 'تقارير أسبوعية', 'اختبارات دورية', 'دعم مستمر'] },
    { nameAr: 'باقة المتميز', name: 'Premium', descriptionAr: 'برنامج مكثف للوصول إلى مستوى الإتقان', price: 799, durationDays: 30, sessionsPerMonth: 24, sortOrder: 3, featuresAr: ['24 حصة شهرياً', 'معلم مخصص', 'خطة دراسية مفصّلة', 'شهادة إتمام', 'مجموعة مراجعة', 'دعم VIP'] },
    { nameAr: 'باقة العائلة', name: 'Family', descriptionAr: 'باقة مشتركة لأكثر من طالب في نفس الأسرة بسعر مخفض', price: 1299, durationDays: 30, sessionsPerMonth: 32, sortOrder: 4, featuresAr: ['32 حصة شهرياً', 'حتى 4 طلاب', 'تقارير موحدة لولي الأمر', 'خصم 15%'] },
  ])
  console.log(`✅ Created ${packages.length} packages`)

  // ── Users ────────────────────────────────────────────────────────────────────
  const admin = await User.create({ firstNameAr: 'أحمد', lastNameAr: 'الإداري', firstName: 'Ahmed', lastName: 'Admin', email: 'admin@tartelah.com', password: 'Admin1234!', role: 'admin', phone: '+966501234567', isEmailVerified: true })
  const admin2 = await User.create({ firstNameAr: 'سلمى', lastNameAr: 'المشرفة', firstName: 'Salma', lastName: 'Supervisor', email: 'admin2@tartelah.com', password: 'Admin1234!', role: 'admin', phone: '+966501234000', isEmailVerified: true })

  const teacher1 = await User.create({ firstNameAr: 'محمد', lastNameAr: 'العمري', firstName: 'Mohammed', lastName: 'Al-Omari', email: 'teacher1@tartelah.com', password: 'Teacher1234!', role: 'teacher', gender: 'male', phone: '+966507654321', bioAr: 'حافظ للقرآن الكريم بالروايات العشر، متخصص في التجويد وعلوم القرآن، خبرة 15 عاماً في التعليم', specialization: 'تجويد وحفظ', salaryPerSession: 45, isEmailVerified: true, meetingLinks: [{ provider: 'zoom', label: 'Zoom الأساسي', link: 'https://zoom.us/j/1234567890' }, { provider: 'meet', label: 'Google Meet', link: 'https://meet.google.com/abc-defg-hij' }] })
  const teacher2 = await User.create({ firstNameAr: 'فاطمة', lastNameAr: 'الزهراني', firstName: 'Fatima', lastName: 'Al-Zahrani', email: 'teacher2@tartelah.com', password: 'Teacher1234!', role: 'teacher', gender: 'female', phone: '+966509876543', bioAr: 'معلمة القرآن والتجويد للأطفال والنساء، حاصلة على إجازة برواية حفص عن عاصم', specialization: 'تعليم الأطفال والتجويد', salaryPerSession: 40, isEmailVerified: true, meetingLinks: [{ provider: 'zoom', label: 'حصص الأطفال', link: 'https://zoom.us/j/9876543210' }] })

  const extraTeacherDefs = [
    { i: 3, gender: 'male', spec: 'إجازة برواية ورش', bio: 'حاصل على إجازة في القراءات العشر، متخصص في التفسير وعلوم القرآن' },
    { i: 4, gender: 'female', spec: 'تحفيظ الأطفال', bio: 'معلمة متخصصة في تحفيظ الأطفال بأسلوب تفاعلي ممتع' },
    { i: 5, gender: 'male', spec: 'تجويد متقدم', bio: 'خبرة 10 سنوات في تدريس أحكام التجويد للمستويات المتقدمة' },
    { i: 6, gender: undefined, spec: 'حفظ ومراجعة', bio: 'معلم حديث الانضمام للمنصة، بيانات الهوية قيد الإكمال' }, // unresolved gender on purpose — exercises the neutral-avatar/no-honorific path
  ]
  const extraTeachers = []
  for (const t of extraTeacherDefs) {
    const base = makeUser('teacher', t.gender || rand(['male', 'female']), t.i)
    if (!t.gender) delete base.gender
    base.bioAr = t.bio
    base.specialization = t.spec
    base.salaryPerSession = randInt(30, 50)
    base.meetingLinks = [{ provider: 'zoom', label: 'الرابط الرئيسي', link: `https://zoom.us/j/${randInt(1000000000, 9999999999)}` }]
    extraTeachers.push(await User.create(base))
  }
  const teachers = [teacher1, teacher2, ...extraTeachers]

  const students = []
  const s1 = await User.create({ firstNameAr: 'عبدالله', lastNameAr: 'السلمي', firstName: 'Abdullah', lastName: 'Al-Salmi', email: 'student1@tartelah.com', password: 'Student1234!', role: 'student', phone: '+966505551234', isEmailVerified: true })
  const s2 = await User.create({ firstNameAr: 'نورة', lastNameAr: 'القحطاني', firstName: 'Noura', lastName: 'Al-Qahtani', email: 'student2@tartelah.com', password: 'Student1234!', role: 'student', phone: '+966505554321', isEmailVerified: true })
  const s3 = await User.create({ firstNameAr: 'يوسف', lastNameAr: 'المطيري', firstName: 'Yousef', lastName: 'Al-Mutairi', email: 'student3@tartelah.com', password: 'Student1234!', role: 'student', phone: '+966505559876', isEmailVerified: true })
  students.push(s1, s2, s3)
  for (let i = 4; i <= 18; i++) {
    students.push(await User.create(makeUser('student', rand(['male', 'female']), i)))
  }

  // ── Canonical dev-login demo accounts ────────────────────────────────────────
  // Exact emails/passwords ensureDevAccounts() (server/src/seed/devSeed.js) also
  // guarantees exist, and the ones auth.controller.js devLogin() looks up FIRST
  // (before falling back to any active teacher/student). Credentials here must
  // stay identical to devSeed.js so the quick-login buttons keep working — only
  // profile/enrichment fields are added on top.
  //
  // Upsert, not create: ensureDevAccounts() runs on every dev-server (re)start
  // (see server.js), independently of this script. If a nodemon restart lands
  // in the gap between this script's deleteMany({}) and this point, it will
  // have already recreated a bare version of these exact accounts — a plain
  // User.create() would then fail on the unique email index. find-then-save
  // instead absorbs that race and still applies the full enrichment below.
  async function upsertDemoAccount(fields) {
    let user = await User.findOne({ email: fields.email })
    if (user) {
      Object.assign(user, fields)
      await user.save()
      return user
    }
    return User.create(fields)
  }

  const demoTeacherMale = await upsertDemoAccount({
    email: 'teacher@tartelah.com', password: 'Teacher123!', role: 'teacher', gender: 'male',
    firstNameAr: 'معلم', lastNameAr: 'تجريبي', firstName: 'Dev', lastName: 'Teacher',
    phone: '+966500000001', specialization: 'تجويد وحفظ',
    bioAr: 'معلم قرآن معتمد، حافظ ومجاز بالسند المتصل، متخصص في تصحيح التلاوة وتثبيت الحفظ لجميع الأعمار',
    salaryPerSession: 45, isEmailVerified: true, isActive: true,
    meetingLinks: [{ provider: 'zoom', label: 'الرابط الرئيسي', link: 'https://zoom.us/j/1112223333' }],
  })
  const demoTeacherFemale = await upsertDemoAccount({
    email: 'teacher.female@tartelah.com', password: 'Teacher123!', role: 'teacher', gender: 'female',
    firstNameAr: 'معلمة', lastNameAr: 'تجريبية', firstName: 'Dev', lastName: 'Teacher Female',
    phone: '+966500000002', specialization: 'تحفيظ الأطفال والنساء',
    bioAr: 'معلمة قرآن متخصصة في تحفيظ الأطفال والنساء، حاصلة على إجازة برواية حفص عن عاصم، خبرة واسعة في التعليم عن بعد',
    salaryPerSession: 40, isEmailVerified: true, isActive: true,
    meetingLinks: [{ provider: 'meet', label: 'حصص الأطفال والنساء', link: 'https://meet.google.com/dev-demo-fem' }],
  })
  const demoStudent = await upsertDemoAccount({
    email: 'student@tartelah.com', password: 'Student123!', role: 'student',
    firstNameAr: 'طالب', lastNameAr: 'تجريبي', firstName: 'Dev', lastName: 'Student',
    phone: '+966500000003', isEmailVerified: true, isActive: true,
  })
  teachers.push(demoTeacherMale, demoTeacherFemale)
  students.push(demoStudent)
  console.log(`✅ Created ${2 + teachers.length + students.length} users (2 admins, ${teachers.length} teachers, ${students.length} students)`)

  // ── Demo-account pairings ────────────────────────────────────────────────────
  // teacher1/teacher2/student1 are extra realistic accounts; demoTeacherMale,
  // demoTeacherFemale and demoStudent (teacher@/teacher.female@/student@) are
  // the actual "quick login" demo accounts — auth.controller.js devLogin looks
  // them up by exact email FIRST, before falling back to any active
  // teacher/student. The randomized loops below already build a full academy's
  // worth of data for every user, but a `rand()` pick can coincidentally skip
  // any single account. Pinning these specific teacher↔student pairs
  // guarantees the demo accounts always show a populated dashboard (assigned
  // students, active schedule, salary data, etc.), while every other
  // teacher/student still gets the same organic random distribution as
  // before. Each pinned teacher gets disjoint students so their dashboards
  // look like different real classrooms.
  const teacher1DemoStudents = [s1, students[3], students[4]]
  const teacher2DemoStudents = [s2, students[7], students[8]]
  const demoTeacherMaleStudents = [demoStudent, students[5], students[6]]
  const demoTeacherFemaleStudents = [students[2], students[9]]
  const demoTeacherByStudentId = new Map()
  teacher1DemoStudents.forEach((st) => demoTeacherByStudentId.set(st._id.toString(), teacher1))
  teacher2DemoStudents.forEach((st) => demoTeacherByStudentId.set(st._id.toString(), teacher2))
  demoTeacherMaleStudents.forEach((st) => demoTeacherByStudentId.set(st._id.toString(), demoTeacherMale))
  demoTeacherFemaleStudents.forEach((st) => demoTeacherByStudentId.set(st._id.toString(), demoTeacherFemale))

  // ── Courses ──────────────────────────────────────────────────────────────────
  const courseDefs = [
    { nameAr: 'أساسيات التجويد', name: 'Tajweed Basics', category: 'tajweed', difficulty: 'beginner', ageGroup: 'adults', status: 'published', featured: true },
    { nameAr: 'حفظ القرآن للأطفال', name: 'Kids Quran Memorization', category: 'hifz', difficulty: 'beginner', ageGroup: 'children', status: 'published', featured: true },
    { nameAr: 'إتقان التجويد المتقدم', name: 'Advanced Tajweed', category: 'tajweed', difficulty: 'advanced', ageGroup: 'adults', status: 'published' },
    { nameAr: 'النظرة والقراءة الصحيحة', name: 'Nazra Reading', category: 'nazra', difficulty: 'beginner', ageGroup: 'children', status: 'published' },
    { nameAr: 'اللغة العربية للناطقين بغيرها', name: 'Arabic for Non-Natives', category: 'arabic', difficulty: 'beginner', ageGroup: 'adults', status: 'published' },
    { nameAr: 'حفظ جزء عمّ', name: 'Juz Amma Memorization', category: 'hifz', difficulty: 'beginner', ageGroup: 'teens', status: 'published', featured: true },
    { nameAr: 'دورة القراءات (تجريبية)', name: 'Qiraat Course (Draft)', category: 'quran', difficulty: 'advanced', ageGroup: 'adults', status: 'draft' },
    { nameAr: 'برنامج صيفي مؤرشف', name: 'Archived Summer Program', category: 'other', difficulty: 'intermediate', ageGroup: 'teens', status: 'archived' },
  ]
  const courses = []
  for (const c of courseDefs) {
    const doc = await Course.create({
      nameAr: c.nameAr, name: c.name,
      shortDescriptionAr: `${c.nameAr} — برنامج تعليمي متكامل مصمم بعناية لتحقيق أفضل نتيجة تعليمية`,
      descriptionAr: `وصف تفصيلي لدورة ${c.nameAr} يشمل الأهداف والمنهج وطريقة التقييم المتبعة في المنصة.`,
      category: c.category, difficulty: c.difficulty, level: c.difficulty, ageGroup: c.ageGroup,
      durationWeeks: randInt(8, 24), estimatedDuration: randInt(20, 60), lessonsCount: randInt(10, 40),
      instructor: rand(teachers)._id,
      learningOutcomesAr: ['إتقان الأحكام الأساسية', 'تطبيق عملي على السور', 'تحسين مخارج الحروف'],
      requirementsAr: ['جهاز بإنترنت مستقر', 'مصحف مطبوع أو إلكتروني'],
      targetAudienceAr: `مناسب لفئة ${c.ageGroup === 'children' ? 'الأطفال' : c.ageGroup === 'teens' ? 'المراهقين' : 'الكبار'}`,
      curriculum: [{ sectionTitleAr: 'الوحدة الأولى', lessons: ['مقدمة', 'الأساسيات', 'تطبيق عملي'] }, { sectionTitleAr: 'الوحدة الثانية', lessons: ['تعميق', 'مراجعة شاملة'] }],
      status: c.status, featured: !!c.featured, enrollmentEnabled: c.status === 'published', certificateAvailable: c.status === 'published',
      studentsCount: c.status === 'published' ? randInt(5, 120) : 0, rating: c.status === 'published' ? +(randInt(38, 50) / 10).toFixed(1) : 0, reviewCount: c.status === 'published' ? randInt(3, 40) : 0,
      createdBy: admin._id,
    })
    courses.push(doc)
  }
  console.log(`✅ Created ${courses.length} courses`)

  // ── Article Categories + Articles ─────────────────────────────────────────────
  const categoryDefs = [
    { name: 'Tajweed', nameAr: 'التجويد', slug: 'tajweed', color: '#7c3aed', icon: '📖' },
    { name: 'Memorization', nameAr: 'الحفظ', slug: 'memorization', color: '#E8C76A', icon: '🕌' },
    { name: 'Parenting', nameAr: 'تربية الأبناء', slug: 'parenting', color: '#22c55e', icon: '👨‍👩‍👧' },
    { name: 'Platform News', nameAr: 'أخبار المنصة', slug: 'platform-news', color: '#3b82f6', icon: '📰' },
  ]
  const categories = await ArticleCategory.insertMany(categoryDefs)

  const articleStatuses = ['published', 'published', 'published', 'published', 'published', 'published', 'draft', 'draft', 'scheduled', 'archived']
  const articleTitles = [
    'أحكام النون الساكنة والتنوين بالتفصيل', '10 نصائح لتثبيت الحفظ', 'كيف تحفّز طفلك على حفظ القرآن',
    'الفرق بين رواية حفص وورش', 'خطة مراجعة أسبوعية فعّالة', 'آداب تلاوة القرآن الكريم',
    'أهمية القراءة الصحيحة قبل الحفظ', 'كيف تختار المعلم المناسب لك', 'قصص نجاح من طلابنا',
    'تحديثات جديدة على منصة ترتيلة',
  ]
  const articles = []
  for (let i = 0; i < articleTitles.length; i++) {
    const status = articleStatuses[i]
    const publishedAt = status === 'published' ? daysFromNow(-randInt(1, 90)) : status === 'archived' ? daysFromNow(-randInt(100, 200)) : undefined
    articles.push(await Article.create({
      title: `Article ${i + 1}`, titleAr: articleTitles[i],
      slug: `article-${i + 1}-${articleTitles[i].split(' ')[0]}`.replace(/[^a-zA-Z0-9؀-ۿ-]/g, ''),
      excerptAr: `مقتطف تعريفي عن مقال "${articleTitles[i]}" يلخص أهم الأفكار الواردة فيه.`,
      contentAr: `<p>محتوى تفصيلي حول ${articleTitles[i]}.</p><p>يتناول هذا المقال عدة محاور تعليمية مهمة لطلاب القرآن الكريم ومعلميه.</p>`,
      author: rand([admin, ...teachers])._id,
      category: rand(categories)._id,
      tags: pick(['تجويد', 'حفظ', 'تعليم', 'أطفال', 'قرآن', 'تربية'], 2),
      status, publishedAt, scheduledAt: status === 'scheduled' ? daysFromNow(randInt(1, 10)) : undefined,
      featured: i < 3, pinned: i === 0,
      views: status === 'published' ? randInt(50, 3000) : 0,
      likes: status === 'published' ? randInt(2, 150) : 0,
      createdBy: admin._id,
    }))
  }
  console.log(`✅ Created ${categories.length} article categories + ${articles.length} articles`)

  // ── Academy Settings + Success Story (singletons) ─────────────────────────────
  await AcademySettings.create({})
  await SuccessStory.create({
    displayMode: 'cards', isActive: true,
    cards: [
      { role: 'teacher', nameAr: teacher1.firstNameAr + ' ' + teacher1.lastNameAr, titleAr: 'معلم العام', descriptionAr: 'تميز بأعلى نسبة رضا من الطلاب هذا العام', badgeAr: 'الأفضل تقييماً', order: 0, isActive: true },
      { role: 'student', nameAr: s1.firstNameAr + ' ' + s1.lastNameAr, titleAr: 'طالب متميز', descriptionAr: 'أنهى حفظ جزء عمّ خلال 3 أشهر فقط', badgeAr: 'إنجاز العام', order: 1, isActive: true },
      { role: 'achievement', nameAr: 'إنجاز جماعي', titleAr: '+500 حصة مكتملة', descriptionAr: 'تجاوزت المنصة 500 حصة تعليمية مكتملة بنجاح', badgeAr: 'إنجاز المنصة', order: 2, isActive: true },
    ],
  })
  console.log('✅ Created academy settings + success story config')

  // ── Subscriptions (covers all status values) ──────────────────────────────────
  const now = new Date()
  const subs = []
  const subStatusPlan = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'active', 'expired', 'expired', 'cancelled', 'paused', 'pending']
  for (let i = 0; i < students.length; i++) {
    const status = subStatusPlan[i] || 'active'
    const pkg = rand(packages)
    const teacher = demoTeacherByStudentId.get(students[i]._id.toString()) || rand(teachers)
    const startDate = status === 'expired' ? daysFromNow(-60) : daysFromNow(-randInt(1, 20))
    const endDate = status === 'expired' ? daysFromNow(-5) : daysFromNow(randInt(5, 30))
    subs.push(await Subscription.create({
      studentId: students[i]._id, teacherId: status === 'pending' ? undefined : teacher._id, packageId: pkg._id,
      packageNameAr: pkg.nameAr,
      startDate, endDate,
      sessionsRemaining: status === 'expired' || status === 'cancelled' ? 0 : randInt(2, pkg.sessionsPerMonth),
      totalSessions: pkg.sessionsPerMonth, amountPaid: pkg.price, status,
      createdBy: admin._id,
    }))
  }
  console.log(`✅ Created ${subs.length} subscriptions (statuses: active/expired/cancelled/paused/pending)`)

  // ── Enrollment Requests (pipeline: pending → under_review → approved/rejected) ─
  const enrollmentRequests = []
  const erStatuses = ['pending', 'pending', 'under_review', 'approved', 'approved', 'rejected']
  for (let i = 0; i < erStatuses.length; i++) {
    const student = students[(i + 5) % students.length]
    const pkg = rand(packages)
    const status = erStatuses[i]
    enrollmentRequests.push(await EnrollmentRequest.create({
      studentId: student._id, packageId: pkg._id, status,
      paymentMethod: rand(['bank_transfer', 'card', 'cash']),
      paymentReference: `REF-${randInt(100000, 999999)}`,
      amount: pkg.price,
      studentNotes: 'أرغب في الالتحاق ببرنامج مناسب لمستواي الحالي',
      adminNotes: status === 'rejected' ? 'إيصال الدفع غير واضح، بانتظار إعادة الإرسال' : status === 'approved' ? 'تم التحقق من الدفع وتفعيل الاشتراك' : undefined,
      teacherId: status === 'approved' ? rand(teachers)._id : undefined,
      reviewedBy: status === 'approved' || status === 'rejected' ? admin._id : undefined,
      reviewedAt: status === 'approved' || status === 'rejected' ? daysFromNow(-randInt(1, 5)) : undefined,
    }))
  }
  console.log(`✅ Created ${enrollmentRequests.length} enrollment requests`)

  // ── Schedule Rules + generated Sessions/Attendance ─────────────────────────────
  const scheduleRules = []
  const sessions = []
  const attendanceStatuses = ['present', 'present', 'present', 'late', 'excused', 'left_early']

  // Extracted so the same realistic past/upcoming session generation can be
  // called both from the generic index-bounded loop below AND explicitly for
  // demoStudent, whose array position falls outside that loop's Math.min(...,
  // 12) cap (it's appended at the end of `students`, after the 18 organic
  // accounts, so index-based iteration never reaches it).
  async function buildScheduleAndSessions(student, teacher, sub, { paused = false } = {}) {
    const rule = await ScheduleRule.create({
      teacherId: teacher._id, studentId: student._id, subscriptionId: sub._id,
      frequency: 'weekly', daysOfWeek: pick([0, 1, 2, 3, 4, 5, 6], 2),
      timeOfDay: `${randInt(16, 21)}:00`, durationMinutes: 60,
      startDate: daysFromNow(-30), sessionsTotal: 12,
      meetingLink: `https://zoom.us/j/${randInt(1000000000, 9999999999)}`, meetingProvider: 'zoom',
      status: paused ? 'paused' : 'active',
    })
    const generatedSessions = []

    // Past sessions (mostly completed, some missed/no_show/cancelled) — exercises payroll/attendance intelligence.
    // Daily (not every-3-days) so the Timeline's default ±3-day window and the
    // Review Queue's 14-day window both have dense, realistic recent coverage.
    const pastCount = randInt(4, 8)
    for (let p = 1; p <= pastCount; p++) {
      const scheduledAt = daysFromNow(-p)
      scheduledAt.setHours(randInt(16, 21), 0, 0, 0)
      const roll = Math.random()
      let status, outcome, payrollStatus, teacherAttendanceStatus
      if (roll < 0.78) { status = 'completed'; outcome = 'delivered'; payrollStatus = 'payable'; teacherAttendanceStatus = 'on_time' }
      else if (roll < 0.88) { status = 'missed'; outcome = 'teacher_absent'; payrollStatus = 'non_payable'; teacherAttendanceStatus = 'absent' }
      else if (roll < 0.95) { status = 'cancelled'; outcome = 'cancelled_by_student'; payrollStatus = 'excluded'; teacherAttendanceStatus = 'excused' }
      else { status = 'completed'; outcome = 'pending_review'; payrollStatus = 'pending_review'; teacherAttendanceStatus = 'late' }

      const s = await Session.create({
        studentId: student._id, teacherId: teacher._id, subscriptionId: sub._id, seriesId: rule._id,
        titleAr: `حصة تجويد رقم ${p}`, scheduledAt, durationMinutes: 60, status,
        completedAt: status === 'completed' ? new Date(scheduledAt.getTime() + 60 * 60 * 1000) : undefined,
        cancelledAt: status === 'cancelled' ? scheduledAt : undefined,
        cancelReason: status === 'cancelled' ? 'ظرف طارئ للطالب' : undefined,
        meetingLink: rule.meetingLink, meetingProvider: 'zoom',
        teacherStartedAt: status !== 'missed' && status !== 'cancelled' ? new Date(scheduledAt.getTime() - 2 * 60 * 1000) : undefined,
        teacherAttendanceStatus, teacherAttendanceMarkedBy: 'system',
        teacherLateMinutes: teacherAttendanceStatus === 'late' ? randInt(5, 20) : 0,
        actualStartAt: status === 'completed' ? scheduledAt : undefined,
        actualEndAt: status === 'completed' ? new Date(scheduledAt.getTime() + 60 * 60 * 1000) : undefined,
        outcome, payrollStatus, payrollStatusSetBy: 'system', payrollStatusSetAt: new Date(),
        attendanceFinalizedAt: status === 'completed' && payrollStatus !== 'pending_review' ? new Date(scheduledAt.getTime() + 65 * 60 * 1000) : undefined,
        attendanceFinalizedBy: status === 'completed' && payrollStatus !== 'pending_review' ? teacher._id : undefined,
        // Every completed session consumed a purchased session (see
        // migrations/backfillSubscriptionConsumed.js) — cancelled/missed
        // sessions never do.
        subscriptionConsumed: status === 'completed',
        subscriptionConsumedAt: status === 'completed' ? new Date(scheduledAt.getTime() + 60 * 60 * 1000) : undefined,
      })
      generatedSessions.push(s)

      if (status === 'completed' || status === 'missed') {
        await Attendance.create({
          sessionId: s._id, studentId: student._id, teacherId: teacher._id,
          status: status === 'missed' ? 'absent' : rand(attendanceStatuses),
          isFinalized: !!s.attendanceFinalizedAt, finalizedAt: s.attendanceFinalizedAt, finalizedBy: s.attendanceFinalizedBy,
        })
      }
    }

    // Upcoming sessions
    for (const daysAhead of [1, 2, 3, 5, 7]) {
      const scheduledAt = daysFromNow(daysAhead)
      scheduledAt.setHours(randInt(16, 21), 0, 0, 0)
      generatedSessions.push(await Session.create({
        studentId: student._id, teacherId: teacher._id, subscriptionId: sub._id, seriesId: rule._id,
        titleAr: 'حصة تجويد مجدولة', scheduledAt, durationMinutes: 60, status: 'scheduled',
        meetingLink: rule.meetingLink, meetingProvider: 'zoom',
      }))
    }

    return { rule, sessions: generatedSessions }
  }

  let ruleCount = 0
  for (let i = 0; i < Math.min(students.length, 12); i++) {
    const student = students[i]
    const teacher = demoTeacherByStudentId.get(student._id.toString()) || rand(teachers)
    const sub = subs[i]
    if (!sub || sub.status === 'pending') continue
    ruleCount++
    const { rule, sessions: gen } = await buildScheduleAndSessions(student, teacher, sub, { paused: ruleCount % 6 === 0 })
    scheduleRules.push(rule)
    sessions.push(...gen)
  }

  // demoStudent is appended at the tail of `students` (index 18), outside the
  // Math.min(students.length, 12) cap above, so it needs an explicit call to
  // guarantee completed/upcoming sessions + attendance for its dashboard.
  const demoStudentIdx = students.findIndex((st) => st._id.toString() === demoStudent._id.toString())
  const demoStudentSub = subs[demoStudentIdx]
  if (demoStudentSub && demoStudentSub.status !== 'pending') {
    const { rule, sessions: gen } = await buildScheduleAndSessions(demoStudent, demoTeacherMale, demoStudentSub)
    scheduleRules.push(rule)
    sessions.push(...gen)
  }
  // ── Today's Operations scenarios ────────────────────────────────────────────
  // The historical/upcoming loop above deliberately never lands a session on
  // "today" (offsets start at ±1 day and beyond) — realistic for ordinary
  // recurring-schedule data, but it means the Operations Center's "Live Now"
  // view (strictly bound to today's exact date range, by design — see
  // operations.controller.js) always showed all-zero stat tiles, no matter
  // when the seeder was run. This block explicitly engineers one session per
  // real operational scenario, timed relative to `now`, so every stat tile,
  // bucket, and review-queue rule in the Operations Center has real data to
  // display and can actually be tested end-to-end.
  const opsNow = new Date()
  const minutesFromNow = (m) => new Date(opsNow.getTime() + m * 60000)
  // The server computes "today" using LOCAL midnight (Session.setHours(0,0,0,0)
  // in operations.controller.js), not a fixed 24h window before `now`. Any
  // scenario timestamp built as a pure `now - X minutes` offset can silently
  // cross that local-midnight boundary and land in "yesterday" depending on
  // what wall-clock time the seeder happens to run at — this bit us during
  // testing (see docs/OPERATIONS_CENTER_AUDIT.md). `pastToday()` clamps any
  // negative offset that would fall before local midnight to a safe point
  // shortly after it instead, so "today" scenarios are always actually today,
  // regardless of when `npm run seed` is executed.
  const localDayStart = new Date(opsNow); localDayStart.setHours(0, 0, 0, 0)
  function pastToday(minutesAgo) {
    const t = minutesFromNow(-minutesAgo)
    if (t.getTime() < localDayStart.getTime()) {
      return new Date(localDayStart.getTime() + randInt(5, 45) * 60000)
    }
    return t
  }
  // Every scenario anchors on a `base` timestamp — clamped through
  // `pastToday()` when it represents "earlier today" — and every other
  // timestamp on that scenario (completedAt, teacherStartedAt, finalizeAt...)
  // is derived as base + N minutes, never as an independent `now`-relative
  // offset. This guarantees internal consistency (nothing "finalized" before
  // it was "completed") even when the clamp kicks in.
  const at = (base, deltaMin) => new Date(base.getTime() + deltaMin * 60000)

  const b1 = pastToday(20)   // live #1
  const b2 = pastToday(10)   // live #2
  const b5 = pastToday(90)   // missing check-in
  const b6 = pastToday(70)   // late teacher, unfinalized
  const b7 = pastToday(180)  // clean completed #1
  const b8 = pastToday(240)  // clean completed #2
  const b9 = pastToday(15)   // cancelled-today's cancelledAt anchor
  const b10 = pastToday(300) // teacher no-show
  const b11 = pastToday(150) // student absent
  const b12 = pastToday(200) // technical issue
  const b13 = pastToday(400) // critical contradiction #1
  const b14 = pastToday(500) // critical contradiction #2
  const bDemoM = pastToday(120) // demoTeacherMale — clean completed session today
  const bDemoF = pastToday(100) // demoTeacherFemale — clean completed session today

  const todayScenarios = [
    { // currently live/ongoing
      teacher: teachers[0], student: students[0], scheduledAt: b1, duration: 60,
      status: 'ongoing', teacherAttendanceStatus: 'on_time', teacherStartedAt: at(b1, 2), meetingLink: true,
    },
    { // currently live/ongoing (second teacher, proves the bucket isn't a fluke of one record)
      teacher: teachers[1], student: students[1], scheduledAt: b2, duration: 60,
      status: 'ongoing', teacherAttendanceStatus: 'on_time', teacherStartedAt: at(b2, 2), meetingLink: true,
    },
    { // starting soon, everything ready
      teacher: teachers[2], student: students[2], scheduledAt: minutesFromNow(30), duration: 60,
      status: 'scheduled', teacherAttendanceStatus: 'pending', meetingLink: true,
    },
    { // starting soon AND missing its meeting link — double-counted on purpose (real overlap)
      teacher: teachers[3], student: students[3], scheduledAt: minutesFromNow(15), duration: 60,
      status: 'scheduled', teacherAttendanceStatus: 'pending', meetingLink: false,
    },
    { // session ended a while ago, teacher never checked in — missing check-in + review flag
      teacher: teachers[4], student: students[4], scheduledAt: b5, duration: 60,
      status: 'scheduled', teacherAttendanceStatus: 'pending', meetingLink: true,
    },
    { // late teacher, session over, attendance still not finalized — hits 3 signals at once
      teacher: teachers[5], student: students[5], scheduledAt: b6, duration: 60,
      status: 'completed', completedAt: at(b6, 65), teacherAttendanceStatus: 'late', teacherLateMinutes: 35,
      teacherStartedAt: at(b6, 35), outcome: 'delivered', payrollStatus: 'payable', meetingLink: true,
      attendance: { status: 'present', finalized: false },
    },
    { // clean, fully resolved, payable — the common/boring case still needs to appear
      teacher: teachers[0], student: students[6], scheduledAt: b7, duration: 60,
      status: 'completed', completedAt: at(b7, 60), teacherAttendanceStatus: 'on_time',
      outcome: 'delivered', payrollStatus: 'payable', meetingLink: true, finalizeAt: at(b7, 65),
      attendance: { status: 'present', finalized: true },
    },
    { // clean, fully resolved, payable — second one for realistic volume
      teacher: teachers[1], student: students[7], scheduledAt: b8, duration: 60,
      status: 'completed', completedAt: at(b8, 60), teacherAttendanceStatus: 'on_time',
      outcome: 'delivered', payrollStatus: 'payable', meetingLink: true, finalizeAt: at(b8, 65),
      attendance: { status: 'present', finalized: true },
    },
    { // cancelled later today, by the student
      teacher: teachers[2], student: students[8], scheduledAt: minutesFromNow(60), duration: 60,
      status: 'cancelled', cancelledAt: b9, cancelReason: 'ظرف طارئ للطالب',
      outcome: 'cancelled_by_student', payrollStatus: 'excluded', meetingLink: true,
    },
    { // teacher no-show — clean/consistent, not a contradiction
      teacher: teachers[3], student: students[9 % students.length], scheduledAt: b10, duration: 60,
      status: 'no_show', teacherAttendanceStatus: 'absent', outcome: 'teacher_absent',
      payrollStatus: 'non_payable', payrollStatusReason: 'المعلم لم يحضر الحصة', meetingLink: true,
      finalizeAt: at(b10, 240), attendance: { status: 'absent', finalized: true },
    },
    { // student absent, teacher present and paid — tests that student absence doesn't silently flip payability
      teacher: teachers[4], student: students[10 % students.length], scheduledAt: b11, duration: 60,
      status: 'completed', completedAt: at(b11, 60), teacherAttendanceStatus: 'on_time',
      outcome: 'delivered', payrollStatus: 'payable', meetingLink: true, finalizeAt: at(b11, 65),
      attendance: { status: 'absent', finalized: true },
    },
    { // technical issue reported — payroll pending_review, needs an admin decision
      teacher: teachers[5], student: students[11 % students.length], scheduledAt: b12, duration: 60,
      status: 'completed', completedAt: at(b12, 60), teacherAttendanceStatus: 'on_time',
      outcome: 'technical_issue', payrollStatus: 'pending_review',
      payrollStatusReason: 'تم الإبلاغ عن مشكلة تقنية — يحتاج مراجعة الإدارة', meetingLink: true,
      attendance: { status: 'technical_issue', finalized: false },
    },
    { // deliberate data contradiction (critical): cancelled but still marked payable
      teacher: teachers[0], student: students[12 % students.length], scheduledAt: b13, duration: 60,
      status: 'cancelled', cancelledAt: at(b13, 10), cancelReason: 'إلغاء إداري بعد التحضير',
      outcome: 'cancelled_by_admin', payrollStatus: 'payable',
      payrollStatusReason: 'بيانات تجريبية لاختبار قائمة المراجعة الحرجة', meetingLink: true,
    },
    { // deliberate data contradiction (critical): no_show status but teacher attendance says on_time
      teacher: teachers[1], student: students[13 % students.length], scheduledAt: b14, duration: 60,
      status: 'no_show', teacherAttendanceStatus: 'on_time', outcome: 'delivered', payrollStatus: 'payable',
      payrollStatusReason: 'بيانات تجريبية لاختبار قائمة المراجعة الحرجة', meetingLink: true,
    },
    { // demoTeacherMale (teacher@tartelah.com) — clean completed session earlier
      // today with demoStudent, so the "sessions today" dashboard tile is never 0.
      teacher: demoTeacherMale, student: demoStudent, scheduledAt: bDemoM, duration: 60,
      status: 'completed', completedAt: at(bDemoM, 60), teacherAttendanceStatus: 'on_time',
      outcome: 'delivered', payrollStatus: 'payable', meetingLink: true, finalizeAt: at(bDemoM, 65),
      attendance: { status: 'present', finalized: true },
    },
    { // demoTeacherFemale (teacher.female@tartelah.com) — same guarantee, with
      // one of her own pinned students so it's a distinct real classroom.
      teacher: demoTeacherFemale, student: demoTeacherFemaleStudents[0], scheduledAt: bDemoF, duration: 60,
      status: 'completed', completedAt: at(bDemoF, 60), teacherAttendanceStatus: 'on_time',
      outcome: 'delivered', payrollStatus: 'payable', meetingLink: true, finalizeAt: at(bDemoF, 65),
      attendance: { status: 'present', finalized: true },
    },
  ]

  for (const sc of todayScenarios) {
    const s = await Session.create({
      studentId: sc.student._id, teacherId: sc.teacher._id,
      titleAr: 'حصة تجويد', scheduledAt: sc.scheduledAt, durationMinutes: sc.duration, status: sc.status,
      completedAt: sc.completedAt, cancelledAt: sc.cancelledAt, cancelReason: sc.cancelReason,
      meetingLink: sc.meetingLink ? `https://zoom.us/j/${randInt(1000000000, 9999999999)}` : undefined,
      meetingProvider: sc.meetingLink ? 'zoom' : undefined,
      teacherStartedAt: sc.teacherStartedAt,
      teacherAttendanceStatus: sc.teacherAttendanceStatus, teacherAttendanceMarkedBy: 'system',
      teacherLateMinutes: sc.teacherLateMinutes || 0,
      outcome: sc.outcome, payrollStatus: sc.payrollStatus, payrollStatusReason: sc.payrollStatusReason,
      payrollStatusSetBy: 'system', payrollStatusSetAt: new Date(),
      attendanceFinalizedAt: sc.finalizeAt, attendanceFinalizedBy: sc.finalizeAt ? sc.teacher._id : undefined,
      // A completed session always consumed a purchased session under both
      // the old (unconditional) and new (attendance-based, since these demo
      // scenarios' `attendance` sub-objects are present/absent as designed)
      // logic — mirrors migrations/backfillSubscriptionConsumed.js.
      subscriptionConsumed: sc.status === 'completed',
      subscriptionConsumedAt: sc.status === 'completed' ? sc.completedAt : undefined,
    })
    sessions.push(s)

    if (sc.attendance) {
      await Attendance.create({
        sessionId: s._id, studentId: sc.student._id, teacherId: sc.teacher._id,
        status: sc.attendance.status, isFinalized: sc.attendance.finalized,
        finalizedAt: sc.attendance.finalized ? sc.finalizeAt : undefined,
        finalizedBy: sc.attendance.finalized ? sc.teacher._id : undefined,
      })
    }
  }
  console.log(`✅ Created ${todayScenarios.length} today-dated operations scenarios (live/starting-soon/missing-checkin/missing-link/late/completed/cancelled/no-show/student-absent/payroll-review/critical-contradictions)`)

  console.log(`✅ Created ${scheduleRules.length} schedule rules + ${sessions.length} sessions + attendance records`)

  // ── Evaluations ──────────────────────────────────────────────────────────────
  const evalTypes = ['tajweed', 'hifz', 'nazra', 'behavior', 'general']
  const evaluations = []
  for (let i = 0; i < 22; i++) {
    const student = rand(students)
    const teacher = rand(teachers)
    evaluations.push({
      studentId: student._id, teacherId: teacher._id, type: rand(evalTypes), score: randInt(5, 10),
      notesAr: 'أداء جيد بشكل عام مع بعض الملاحظات القابلة للتحسين',
      strengths: pick(['إتقان المدود', 'جودة الصوت', 'الالتزام بالمواعيد', 'دقة الحفظ', 'ترتيل جميل'], 2),
      improvements: pick(['تحسين الغنة', 'مراجعة أحكام الميم', 'التطبيق العملي للإظهار', 'تحسين المخارج'], 1),
    })
  }
  await Evaluation.insertMany(evaluations)
  console.log(`✅ Created ${evaluations.length} evaluations`)

  // ── Homework ─────────────────────────────────────────────────────────────────
  const hwTitles = ['مراجعة سورة الملك', 'حفظ سورة الإنسان', 'تسميع جزء عمّ', 'مراجعة أحكام النون الساكنة', 'حفظ سورة يس', 'تطبيق أحكام المدود']
  for (let i = 0; i < hwTitles.length; i++) {
    const teacher = rand(teachers)
    const assigned = pick(students, randInt(2, 4))
    const submissions = assigned.filter(() => Math.random() < 0.6).map((st) => ({
      studentId: st._id, content: 'أتممت الواجب والحمد لله، ركّزت على النقاط المطلوبة',
      submittedAt: daysFromNow(-randInt(0, 3)),
      status: Math.random() < 0.6 ? 'graded' : 'submitted',
      grade: Math.random() < 0.6 ? randInt(6, 10) : undefined,
      teacherFeedback: Math.random() < 0.6 ? 'أحسنت، استمر على هذا المستوى' : undefined,
      gradedAt: Math.random() < 0.6 ? daysFromNow(-randInt(0, 2)) : undefined,
    }))
    await Homework.create({
      teacherId: teacher._id, titleAr: hwTitles[i], descriptionAr: `${hwTitles[i]} مع ضبط أحكام التجويد المطلوبة`,
      assignedTo: assigned.map((s) => s._id), dueDate: daysFromNow(randInt(-2, 7)),
      status: i % 5 === 0 ? 'closed' : 'active', submissions,
    })
  }
  console.log(`✅ Created ${hwTitles.length} homework assignments`)

  // ── Memorization + Revision ─────────────────────────────────────────────────
  const qualities = ['excellent', 'good', 'fair', 'weak']
  const memoDocs = []
  const revDocs = []
  for (const student of students) {
    const teacher = rand(teachers)
    for (let i = 0; i < randInt(2, 4); i++) {
      const surah = randInt(60, 114)
      memoDocs.push({ studentId: student._id, teacherId: teacher._id, surahNumber: surah, fromAyah: 1, toAyah: randInt(5, 40), quality: rand(qualities) })
    }
    if (Math.random() < 0.7) {
      revDocs.push({ studentId: student._id, teacherId: teacher._id, surahNumber: randInt(60, 114), fromAyah: 1, toAyah: randInt(5, 40), quality: rand(qualities) })
    }
  }
  await Memorization.insertMany(memoDocs)
  await Revision.insertMany(revDocs)
  console.log(`✅ Created ${memoDocs.length} memorization + ${revDocs.length} revision records`)

  // ── Notifications ────────────────────────────────────────────────────────────
  const notifDefs = []
  for (const student of students) {
    notifDefs.push({ userId: student._id, titleAr: 'أهلاً بك في ترتيلة!', bodyAr: 'تم إنشاء حسابك بنجاح.', type: 'system', isRead: Math.random() < 0.6 })
    if (Math.random() < 0.5) notifDefs.push({ userId: student._id, titleAr: 'واجب جديد', bodyAr: 'تم إسناد واجب جديد لك، يرجى مراجعة صفحة الواجبات', type: 'homework', priority: 'medium', isRead: Math.random() < 0.4 })
    if (Math.random() < 0.4) notifDefs.push({ userId: student._id, titleAr: 'تقييم جديد', bodyAr: 'أضاف معلمك تقييماً جديداً على أدائك', type: 'evaluation', isRead: Math.random() < 0.4 })
    if (Math.random() < 0.3) notifDefs.push({ userId: student._id, titleAr: 'تذكير بالحصة القادمة', bodyAr: 'لديك حصة مجدولة خلال 24 ساعة', type: 'session', priority: 'high', isRead: false })
  }
  for (const teacher of teachers) {
    notifDefs.push({ userId: teacher._id, titleAr: 'طالب جديد', bodyAr: 'تم إضافة طالب جديد إلى قائمتك', type: 'system', isRead: Math.random() < 0.5 })
    notifDefs.push({ userId: teacher._id, titleAr: 'تم تسليم واجب', bodyAr: 'قام أحد طلابك بتسليم واجب بانتظار التصحيح', type: 'homework', isRead: false })
  }
  notifDefs.push({ userId: admin._id, titleAr: 'طلب تسجيل جديد', bodyAr: 'يوجد طلب تسجيل جديد بانتظار المراجعة', type: 'enrollment', priority: 'high', isRead: false })
  notifDefs.push({ userId: admin._id, titleAr: 'رسالة تواصل جديدة', bodyAr: 'وصلتك رسالة جديدة من نموذج التواصل', type: 'system', isRead: false })
  notifDefs.push({ userId: admin2._id, titleAr: 'تقرير الأسبوع', bodyAr: 'تم إنجاز عدد جيد من الحصص هذا الأسبوع بنجاح', type: 'system', isRead: true })
  await Notification.insertMany(notifDefs)
  console.log(`✅ Created ${notifDefs.length} notifications`)

  // ── Guaranteed demo-account enrichment ────────────────────────────────────────
  // Everything above already gives every teacher/student a realistic *chance* of
  // evaluations/homework/notifications via rand()/Math.random(). This block adds
  // a small guaranteed set of tightly-linked records on top for four pinned demo
  // pairs — teacher1/teacher2/student1 (extra realistic accounts) plus the actual
  // quick-login accounts demoTeacherMale/demoTeacherFemale/demoStudent — so their
  // dashboards are never empty regardless of RNG luck. Reuses the exact same
  // teachers/students/packages already created above, no new users.
  const demoPairs = [
    { teacher: teacher1, students: teacher1DemoStudents },
    { teacher: teacher2, students: teacher2DemoStudents },
    { teacher: demoTeacherMale, students: demoTeacherMaleStudents },
    { teacher: demoTeacherFemale, students: demoTeacherFemaleStudents },
  ]
  const demoEvaluations = []
  const demoNotifications = []
  for (const { teacher, students: pairStudents } of demoPairs) {
    pairStudents.forEach((student, idx) => {
      demoEvaluations.push({
        studentId: student._id, teacherId: teacher._id, type: idx === 0 ? 'tajweed' : idx === 1 ? 'hifz' : 'general',
        score: randInt(7, 10),
        notesAr: 'أداء متميز في الحصص الأخيرة مع التزام واضح بالمراجعة',
        strengths: pick(['إتقان المدود', 'جودة الصوت', 'الالتزام بالمواعيد', 'دقة الحفظ', 'ترتيل جميل'], 2),
        improvements: pick(['تحسين الغنة', 'مراجعة أحكام الميم', 'تحسين المخارج'], 1),
      })
      demoNotifications.push({ userId: student._id, titleAr: 'تقييم جديد', bodyAr: `أضاف معلمك ${teacher.firstNameAr} تقييماً جديداً على أدائك`, type: 'evaluation', isRead: false })
      demoNotifications.push({ userId: student._id, titleAr: 'تذكير بالحصة القادمة', bodyAr: 'لديك حصة مجدولة خلال 24 ساعة', type: 'session', priority: 'high', isRead: false })
    })

    // One extra Revision ("مراجعة/تجويد") record per pinned student — Memorization
    // is already guaranteed per-student below, but Revision is only ~70% likely there.
    for (const student of pairStudents) {
      await Revision.create({ studentId: student._id, teacherId: teacher._id, surahNumber: randInt(78, 114), fromAyah: 1, toAyah: randInt(10, 30), quality: rand(['excellent', 'good']) })
    }

    // Homework #1 — open/active, due in the future, with one ungraded submission
    // from the first pinned student → exercises "pending homework" for the
    // student dashboard and "homework awaiting review" for the teacher at once.
    await Homework.create({
      teacherId: teacher._id, titleAr: 'مراجعة تسميع الأسبوع', descriptionAr: 'تسميع المقطع المحفوظ هذا الأسبوع مع ضبط أحكام التجويد',
      assignedTo: pairStudents.map((s) => s._id), dueDate: daysFromNow(randInt(3, 7)), status: 'active',
      submissions: [{ studentId: pairStudents[0]._id, content: 'أتممت الحفظ والمراجعة، جاهز للتسميع', submittedAt: daysFromNow(-1), status: 'submitted' }],
    })

    // Homework #2 — closed, fully graded, so "homework reviews" shows completed history too
    await Homework.create({
      teacherId: teacher._id, titleAr: 'مراجعة أحكام المدود', descriptionAr: 'حل تمارين أحكام المدود وإرسال التسميع الصوتي',
      assignedTo: pairStudents.map((s) => s._id), dueDate: daysFromNow(-2), status: 'closed',
      submissions: pairStudents.map((s) => ({
        studentId: s._id, content: 'تم الحل والتسميع كما هو مطلوب', submittedAt: daysFromNow(-5),
        status: 'graded', grade: randInt(8, 10), teacherFeedback: 'ممتاز، استمر على هذا المستوى', gradedAt: daysFromNow(-3),
      })),
    })
  }
  await Evaluation.insertMany(demoEvaluations)
  await Notification.insertMany(demoNotifications)
  const demoPairsRevisionCount = demoPairs.reduce((n, p) => n + p.students.length, 0)
  console.log(`✅ Enriched demo accounts (teacher1/teacher2/student1/teacher@/teacher.female@/student@): ${demoEvaluations.length} evaluations, ${demoPairs.length * 2} homework assignments, ${demoNotifications.length} notifications, ${demoPairsRevisionCount} revision records`)

  // ── Testimonials ─────────────────────────────────────────────────────────────
  await Testimonial.insertMany([
    { nameAr: 'أم عبدالله', bodyAr: 'تجربة رائعة! ابني تعلّم أحكام التجويد خلال شهرين فقط مع أسلوب المعلم الرائع.', rating: 5, isActive: true, sortOrder: 1 },
    { nameAr: 'محمد العتيبي', bodyAr: 'منصة احترافية وسهلة الاستخدام. المعلمون متخصصون ومتفانون في عملهم.', rating: 5, isActive: true, sortOrder: 2 },
    { nameAr: 'سارة الشمري', bodyAr: 'أنهيت حفظ جزء عمّ في 3 أشهر بفضل المتابعة المستمرة والتقييمات الدقيقة.', rating: 5, isActive: true, sortOrder: 3 },
    { nameAr: 'عمر البقمي', bodyAr: 'أفضل منصة لتعلم القرآن عبر الإنترنت. الجدول مرن والمعلم يتكيف مع احتياجاتي.', rating: 4, isActive: true, sortOrder: 4 },
    { nameAr: 'خالد الحربي', bodyAr: 'الدعم الفني سريع والمعلمة صبورة جداً مع أطفالي.', rating: 5, isActive: true, sortOrder: 5 },
    { nameAr: 'ريم الدوسري', bodyAr: 'أنصح بها كل من يبحث عن جدية واحترافية في تعليم القرآن.', rating: 4, isActive: true, sortOrder: 6 },
  ])
  console.log('✅ Created 6 testimonials')

  // ── FAQs ──────────────────────────────────────────────────────────────────────
  await FAQ.insertMany([
    { questionAr: 'ما هي متطلبات التسجيل في المنصة؟', answerAr: 'يكفي أن تكون لديك رغبة في تعلم القرآن الكريم! لا يشترط مستوى معين مسبق.', isActive: true, sortOrder: 1 },
    { questionAr: 'كيف تتم الحصص الدراسية؟', answerAr: 'تتم الحصص عبر الإنترنت (Zoom, Google Meet) في أوقات تناسبك.', isActive: true, sortOrder: 2 },
    { questionAr: 'هل يمكن تغيير المعلم؟', answerAr: 'نعم، يمكنك طلب تغيير المعلم وسنقوم بذلك فور إشعارنا.', isActive: true, sortOrder: 3 },
    { questionAr: 'ما الفرق بين الباقات؟', answerAr: 'تختلف الباقات في عدد الحصص الشهرية ومستوى الدعم المقدم.', isActive: true, sortOrder: 4 },
    { questionAr: 'هل توجد تجربة مجانية؟', answerAr: 'نعم! نقدم حصة تجريبية مجانية مع أحد معلمينا.', isActive: true, sortOrder: 5 },
    { questionAr: 'كيف يتم الدفع؟', answerAr: 'ندعم وسائل الدفع الإلكترونية المعتمدة وكذلك التحويل البنكي.', isActive: true, sortOrder: 6 },
    { questionAr: 'كيف يُحتسب الغياب؟', answerAr: 'يُسجَّل الغياب تلقائياً إذا لم يتم رصد حضور المعلم أو الطالب خلال نافذة زمنية محددة، ويمكن لولي الأمر مراجعة نسبة الحضور من لوحة التحكم.', isActive: true, sortOrder: 7 },
    { questionAr: 'هل يمكن استرجاع حصة فائتة؟', answerAr: 'نعم، في حال الغياب بعذر يمكن التنسيق مع المعلم لجدولة حصة تعويضية.', isActive: true, sortOrder: 8 },
  ])
  console.log('✅ Created 8 FAQs')

  // ── Contact Messages ──────────────────────────────────────────────────────────
  const contactStatuses = ['new', 'new', 'read', 'replied', 'replied', 'archived']
  const contactDocs = []
  for (let i = 0; i < contactStatuses.length; i++) {
    const status = contactStatuses[i]
    contactDocs.push({
      name: `زائر ${i + 1}`, email: `visitor${i + 1}@example.com`, phone: `+96650${randInt(1000000, 9999999)}`,
      country: rand(['السعودية', 'مصر', 'الإمارات', 'الكويت']), subject: rand(['استفسار عن الباقات', 'مشكلة تقنية', 'طلب معلومات عن معلم']),
      message: 'أرغب في معرفة المزيد عن آلية التسجيل والحصص التجريبية المتاحة.',
      preferredContact: rand(['email', 'phone', 'whatsapp']), status,
      readAt: status !== 'new' ? daysFromNow(-randInt(1, 5)) : undefined,
      repliedAt: status === 'replied' ? daysFromNow(-randInt(0, 3)) : undefined,
    })
  }
  await ContactMessage.insertMany(contactDocs)
  console.log(`✅ Created ${contactDocs.length} contact messages`)

  // ── Audit Log (sample of the actions the app itself would log) ────────────────
  const auditDocs = [
    { actorId: admin._id, actorRole: 'admin', action: 'enrollment.approved', entity: 'EnrollmentRequest', entityId: enrollmentRequests.find((e) => e.status === 'approved')?._id, changes: { status: { from: 'under_review', to: 'approved' } } },
    { actorId: admin._id, actorRole: 'admin', action: 'enrollment.rejected', entity: 'EnrollmentRequest', entityId: enrollmentRequests.find((e) => e.status === 'rejected')?._id, changes: { status: { from: 'under_review', to: 'rejected' } } },
    { actorId: admin._id, actorRole: 'admin', action: 'subscription.create', entity: 'Subscription', entityId: subs[0]?._id, changes: { status: 'active' } },
    { actorId: teachers[0]._id, actorRole: 'teacher', action: 'session.check_in', entity: 'Session', entityId: sessions[0]?._id, changes: { teacherAttendanceStatus: 'on_time' } },
    { actorId: teachers[0]._id, actorRole: 'teacher', action: 'attendance.finalize', entity: 'Attendance', entityId: sessions[0]?._id, changes: { isFinalized: true } },
    { actorId: admin2._id, actorRole: 'admin', action: 'attendance.admin_correction', entity: 'Session', entityId: sessions[1]?._id, changes: { payrollStatus: { from: 'pending_review', to: 'payable' } } },
    { actorId: admin._id, actorRole: 'admin', action: 'reset_password', entity: 'User', entityId: students[0]._id, changes: { field: 'password' } },
  ].filter((d) => d.entityId)
  await AuditLog.insertMany(auditDocs)
  console.log(`✅ Created ${auditDocs.length} audit log entries`)

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete! Demo credentials:')
  console.log('   Admin:            admin@tartelah.com         / Admin1234!')
  console.log('   Admin 2:          admin2@tartelah.com        / Admin1234!')
  console.log('   Quick-login (devLogin) accounts — fully populated dashboards:')
  console.log('   Teacher:          teacher@tartelah.com        / Teacher123!')
  console.log('   Teacher (female): teacher.female@tartelah.com / Teacher123!')
  console.log('   Student:          student@tartelah.com        / Student123!')
  console.log('   Other realistic accounts:')
  console.log('   Teacher1: teacher1@tartelah.com / Teacher1234!')
  console.log('   Teacher2: teacher2@tartelah.com / Teacher1234!')
  console.log('   Teachers 3-6: teacher3..6@tartelah.com / Teacher1234!')
  console.log('   Student1: student1@tartelah.com / Student1234!')
  console.log('   Student2: student2@tartelah.com / Student1234!')
  console.log('   Student3: student3@tartelah.com / Student1234!')
  console.log('   Students 4-18: student4..18@tartelah.com / Student1234!\n')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
