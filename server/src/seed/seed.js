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
const Enrollment = require('../models/Enrollment')
const Testimonial = require('../models/Testimonial')
const FAQ = require('../models/FAQ')

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'tartelah' })
  console.log('✅ Connected to MongoDB')

  // ── Clear existing data ──────────────────────────────────────────────────────
  const collections = [User, Course, Package, Subscription, Session, Attendance,
    Evaluation, Homework, Memorization, Revision, Notification, Enrollment, Testimonial, FAQ]
  for (const Model of collections) await Model.deleteMany({})
  console.log('🗑️  Cleared all collections')

  // ── Packages ────────────────────────────────────────────────────────────────
  const packages = await Package.insertMany([
    {
      nameAr: 'باقة الأساس', name: 'Basic',
      descriptionAr: 'مثالية للمبتدئين في رحلة حفظ القرآن الكريم',
      price: 299, durationDays: 30, sessionsPerMonth: 8, sortOrder: 1,
      featuresAr: ['8 حصص شهرياً', 'متابعة الحفظ', 'تقارير دورية', 'دعم عبر الواتساب'],
    },
    {
      nameAr: 'باقة المتقدم', name: 'Standard',
      descriptionAr: 'للطلاب الجادين في إتقان أحكام التجويد',
      price: 499, durationDays: 30, sessionsPerMonth: 16, isPopular: true, sortOrder: 2,
      featuresAr: ['16 حصة شهرياً', 'متابعة الحفظ والتجويد', 'تقارير أسبوعية', 'اختبارات دورية', 'دعم مستمر'],
    },
    {
      nameAr: 'باقة المتميز', name: 'Premium',
      descriptionAr: 'برنامج مكثف للوصول إلى مستوى الإتقان',
      price: 799, durationDays: 30, sessionsPerMonth: 24, sortOrder: 3,
      featuresAr: ['24 حصة شهرياً', 'معلم مخصص', 'خطة دراسية مفصّلة', 'شهادة إتمام', 'مجموعة مراجعة', 'دعم VIP'],
    },
  ])
  console.log(`✅ Created ${packages.length} packages`)

  // ── Courses ──────────────────────────────────────────────────────────────────
  const courses = await Course.insertMany([
    {
      nameAr: 'أساسيات التجويد', name: 'Tajweed Basics',
      descriptionAr: 'تعلم أحكام التجويد من الصفر مع تطبيق عملي على السور القصيرة',
      level: 'beginner', ageGroup: 'adults', durationWeeks: 12,
      syllabusAr: ['أحكام النون الساكنة', 'أحكام الميم الساكنة', 'المدود', 'صفات الحروف'],
    },
    {
      nameAr: 'حفظ القرآن للأطفال', name: 'Kids Quran Memorization',
      descriptionAr: 'برنامج مخصص للأطفال لحفظ القرآن بأسلوب ممتع وتفاعلي',
      level: 'beginner', ageGroup: 'children', durationWeeks: 24,
      syllabusAr: ['سورة الفاتحة', 'جزء عمّ', 'جزء تبارك', 'الجزء الثلاثون'],
    },
    {
      nameAr: 'إتقان التجويد المتقدم', name: 'Advanced Tajweed',
      descriptionAr: 'للطلاب المتقدمين: إتقان جميع أحكام التجويد وتطبيقها في الحفظ',
      level: 'advanced', ageGroup: 'adults', durationWeeks: 16,
      syllabusAr: ['المقاطع والمبادئ', 'الوقف والابتداء', 'الأحكام الدقيقة', 'مراجعة شاملة'],
    },
  ])
  console.log(`✅ Created ${courses.length} courses`)

  // ── Users ────────────────────────────────────────────────────────────────────
  const [admin, teacher1, teacher2, student1, student2, student3] = await User.create([
    {
      firstNameAr: 'أحمد', lastNameAr: 'الإداري', firstName: 'Ahmed', lastName: 'Admin',
      email: 'admin@tartelah.com', password: 'Admin1234!', role: 'admin',
      phone: '+966501234567', isEmailVerified: true,
    },
    {
      firstNameAr: 'الشيخ محمد', lastNameAr: 'العمري', firstName: 'Sheikh Mohammed', lastName: 'Al-Omari',
      email: 'teacher1@tartelah.com', password: 'Teacher1234!', role: 'teacher',
      phone: '+966507654321', bioAr: 'حافظ للقرآن الكريم بالروايات العشر، متخصص في التجويد وعلوم القرآن، خبرة 15 عاماً في التعليم',
      specialization: 'تجويد وحفظ', isEmailVerified: true,
      meetingLinks: [
        { provider: 'zoom', label: 'Zoom الأساسي', link: 'https://zoom.us/j/1234567890' },
        { provider: 'meet', label: 'Google Meet', link: 'https://meet.google.com/abc-defg-hij' },
      ],
    },
    {
      firstNameAr: 'الشيخة فاطمة', lastNameAr: 'الزهراني', firstName: 'Sheikha Fatima', lastName: 'Al-Zahrani',
      email: 'teacher2@tartelah.com', password: 'Teacher1234!', role: 'teacher',
      phone: '+966509876543', bioAr: 'معلمة القرآن والتجويد للأطفال والنساء، حاصلة على إجازة برواية حفص عن عاصم',
      specialization: 'تعليم الأطفال والتجويد', isEmailVerified: true,
      meetingLinks: [
        { provider: 'zoom', label: 'حصص الأطفال', link: 'https://zoom.us/j/9876543210' },
      ],
    },
    {
      firstNameAr: 'عبدالله', lastNameAr: 'السلمي', firstName: 'Abdullah', lastName: 'Al-Salmi',
      email: 'student1@tartelah.com', password: 'Student1234!', role: 'student',
      phone: '+966505551234', isEmailVerified: true,
    },
    {
      firstNameAr: 'نورة', lastNameAr: 'القحطاني', firstName: 'Noura', lastName: 'Al-Qahtani',
      email: 'student2@tartelah.com', password: 'Student1234!', role: 'student',
      phone: '+966505554321', isEmailVerified: true,
    },
    {
      firstNameAr: 'يوسف', lastNameAr: 'المطيري', firstName: 'Yousef', lastName: 'Al-Mutairi',
      email: 'student3@tartelah.com', password: 'Student1234!', role: 'student',
      phone: '+966505559876', isEmailVerified: true,
    },
  ])
  console.log('✅ Created 6 users (1 admin, 2 teachers, 3 students)')

  // ── Subscriptions ────────────────────────────────────────────────────────────
  const now = new Date()
  const sub1 = await Subscription.create({
    studentId: student1._id, teacherId: teacher1._id, packageId: packages[1]._id,
    startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
    sessionsRemaining: 12, totalSessions: 16, amountPaid: 499, status: 'active',
    createdBy: admin._id,
  })
  const sub2 = await Subscription.create({
    studentId: student2._id, teacherId: teacher2._id, packageId: packages[0]._id,
    startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
    sessionsRemaining: 7, totalSessions: 8, amountPaid: 299, status: 'active',
    createdBy: admin._id,
  })
  const sub3 = await Subscription.create({
    studentId: student3._id, teacherId: teacher1._id, packageId: packages[2]._id,
    startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
    sessionsRemaining: 18, totalSessions: 24, amountPaid: 799, status: 'active',
    createdBy: admin._id,
  })
  console.log('✅ Created 3 subscriptions')

  // ── Enrollments ──────────────────────────────────────────────────────────────
  await Enrollment.insertMany([
    { studentId: student1._id, courseId: courses[0]._id, teacherId: teacher1._id, status: 'active', progressPercent: 45 },
    { studentId: student2._id, courseId: courses[1]._id, teacherId: teacher2._id, status: 'active', progressPercent: 30 },
    { studentId: student3._id, courseId: courses[2]._id, teacherId: teacher1._id, status: 'active', progressPercent: 70 },
  ])
  console.log('✅ Created 3 enrollments')

  // ── Sessions ─────────────────────────────────────────────────────────────────
  const sessions = []

  // Past sessions (completed)
  for (let i = 1; i <= 6; i++) {
    const scheduledAt = new Date(now.getTime() - i * 2 * 24 * 60 * 60 * 1000)
    scheduledAt.setHours(10, 0, 0, 0)
    const s = await Session.create({
      studentId: i <= 3 ? student1._id : student3._id,
      teacherId: teacher1._id,
      subscriptionId: i <= 3 ? sub1._id : sub3._id,
      titleAr: `حصة التجويد رقم ${i}`,
      scheduledAt,
      durationMinutes: 60,
      status: 'completed',
      completedAt: new Date(scheduledAt.getTime() + 60 * 60 * 1000),
      meetingLink: 'https://zoom.us/j/1234567890',
      meetingProvider: 'zoom',
    })
    sessions.push(s)

    // Create attendance for completed sessions
    await Attendance.create({
      sessionId: s._id,
      studentId: s.studentId,
      teacherId: s.teacherId,
      status: i === 3 ? 'late' : 'present',
    })
  }

  // Upcoming sessions
  const upcoming = [
    { studentId: student1._id, teacherId: teacher1._id, subId: sub1._id, daysAhead: 1 },
    { studentId: student2._id, teacherId: teacher2._id, subId: sub2._id, daysAhead: 2 },
    { studentId: student3._id, teacherId: teacher1._id, subId: sub3._id, daysAhead: 3 },
    { studentId: student1._id, teacherId: teacher1._id, subId: sub1._id, daysAhead: 7 },
  ]
  for (const u of upcoming) {
    const scheduledAt = new Date(now.getTime() + u.daysAhead * 24 * 60 * 60 * 1000)
    scheduledAt.setHours(10, 0, 0, 0)
    const s = await Session.create({
      studentId: u.studentId,
      teacherId: u.teacherId,
      subscriptionId: u.subId,
      titleAr: `حصة تجويد مجدولة`,
      scheduledAt,
      durationMinutes: 60,
      status: 'scheduled',
      meetingLink: 'https://zoom.us/j/1234567890',
      meetingProvider: 'zoom',
    })
    sessions.push(s)
  }
  console.log(`✅ Created ${sessions.length} sessions`)

  // ── Evaluations ──────────────────────────────────────────────────────────────
  await Evaluation.insertMany([
    {
      studentId: student1._id, teacherId: teacher1._id, type: 'tajweed',
      score: 8, notesAr: 'أداء ممتاز في المدود، يحتاج تحسيناً في الغنة',
      strengths: ['إتقان المدود', 'جودة الصوت', 'الالتزام بالمواعيد'],
      improvements: ['تحسين الغنة', 'مراجعة أحكام الميم'],
    },
    {
      studentId: student1._id, teacherId: teacher1._id, type: 'hifz',
      score: 9, notesAr: 'حفظ قوي جداً مع تجويد ممتاز',
      strengths: ['دقة الحفظ', 'ترتيل جميل'],
      improvements: ['مراجعة المتشابهات'],
    },
    {
      studentId: student3._id, teacherId: teacher1._id, type: 'tajweed',
      score: 7, notesAr: 'مستوى جيد مع إمكانية التطوير',
      strengths: ['فهم الأحكام النظرية', 'الحضور المنتظم'],
      improvements: ['التطبيق العملي للإظهار', 'تحسين المخارج'],
    },
    {
      studentId: student2._id, teacherId: teacher2._id, type: 'general',
      score: 8, notesAr: 'طالبة مجتهدة ومتحمسة للتعلم',
      strengths: ['الالتزام والمواظبة', 'التفاعل مع المعلمة'],
      improvements: ['تخصيص وقت للمراجعة اليومية'],
    },
  ])
  console.log('✅ Created evaluations')

  // ── Homework ─────────────────────────────────────────────────────────────────
  const hw1 = await Homework.create({
    teacherId: teacher1._id,
    titleAr: 'مراجعة سورة الملك',
    descriptionAr: 'مراجعة سورة الملك كاملة مع تطبيق أحكام المدود',
    assignedTo: [student1._id, student3._id],
    dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    submissions: [
      {
        studentId: student1._id,
        contentAr: 'أتممت المراجعة والحمد لله، ركّزت على المدود والغنة',
        submittedAt: new Date(),
        isGraded: true,
        grade: 9,
      },
    ],
  })
  const hw2 = await Homework.create({
    teacherId: teacher1._id,
    titleAr: 'حفظ سورة الإنسان',
    descriptionAr: 'حفظ الآيات 1-15 من سورة الإنسان مع ضبط التجويد',
    assignedTo: [student1._id, student3._id],
    dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    submissions: [],
  })
  await Homework.create({
    teacherId: teacher2._id,
    titleAr: 'تسميع جزء عمّ',
    descriptionAr: 'تسميع جزء عمّ كاملاً في الحصة القادمة',
    assignedTo: [student2._id],
    dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    submissions: [],
  })
  console.log('✅ Created 3 homework assignments')

  // ── Memorization Records ─────────────────────────────────────────────────────
  await Memorization.insertMany([
    { studentId: student1._id, teacherId: teacher1._id, surahNumber: 67, fromAyah: 1, toAyah: 30, quality: 'excellent' },
    { studentId: student1._id, teacherId: teacher1._id, surahNumber: 68, fromAyah: 1, toAyah: 20, quality: 'good' },
    { studentId: student1._id, teacherId: teacher1._id, surahNumber: 69, fromAyah: 1, toAyah: 15, quality: 'good' },
    { studentId: student3._id, teacherId: teacher1._id, surahNumber: 78, fromAyah: 1, toAyah: 40, quality: 'excellent' },
    { studentId: student3._id, teacherId: teacher1._id, surahNumber: 79, fromAyah: 1, toAyah: 46, quality: 'good' },
    { studentId: student2._id, teacherId: teacher2._id, surahNumber: 112, fromAyah: 1, toAyah: 4, quality: 'excellent' },
    { studentId: student2._id, teacherId: teacher2._id, surahNumber: 113, fromAyah: 1, toAyah: 5, quality: 'excellent' },
    { studentId: student2._id, teacherId: teacher2._id, surahNumber: 114, fromAyah: 1, toAyah: 6, quality: 'good' },
  ])

  await Revision.insertMany([
    { studentId: student1._id, teacherId: teacher1._id, surahNumber: 67, fromAyah: 1, toAyah: 30, quality: 'excellent' },
    { studentId: student1._id, teacherId: teacher1._id, surahNumber: 68, fromAyah: 1, toAyah: 20, quality: 'good' },
    { studentId: student3._id, teacherId: teacher1._id, surahNumber: 78, fromAyah: 1, toAyah: 40, quality: 'good' },
  ])
  console.log('✅ Created memorization & revision records')

  // ── Notifications ─────────────────────────────────────────────────────────────
  await Notification.insertMany([
    { userId: student1._id, titleAr: 'أهلاً بك في ترتيلة!', bodyAr: 'تم إنشاء حسابك بنجاح.', type: 'system', isRead: true },
    { userId: student1._id, titleAr: 'تم تفعيل اشتراكك', bodyAr: 'تم تفعيل باقة المتقدم. رحلتك مع القرآن تبدأ الآن!', type: 'subscription' },
    { userId: student1._id, titleAr: 'واجب جديد', bodyAr: 'الأستاذ محمد أرسل لك واجباً: مراجعة سورة الملك', type: 'homework' },
    { userId: student1._id, titleAr: 'تقييم جديد', bodyAr: 'أضاف معلمك تقييماً جديداً على حصة التجويد', type: 'evaluation' },
    { userId: teacher1._id, titleAr: 'طالب جديد', bodyAr: 'تم إضافة عبدالله السلمي إلى قائمة طلابك', type: 'system' },
    { userId: teacher1._id, titleAr: 'تم إكمال واجب', bodyAr: 'عبدالله السلمي سلّم واجب مراجعة سورة الملك', type: 'homework' },
    { userId: student2._id, titleAr: 'أهلاً بك في ترتيلة!', bodyAr: 'تم إنشاء حسابك بنجاح.', type: 'system', isRead: true },
    { userId: student3._id, titleAr: 'أهلاً بك في ترتيلة!', bodyAr: 'تم إنشاء حسابك بنجاح.', type: 'system' },
    { userId: admin._id, titleAr: 'تقرير الأسبوع', bodyAr: 'تم إنجاز 12 حصة هذا الأسبوع بنجاح', type: 'system' },
  ])
  console.log('✅ Created notifications')

  // ── Testimonials ─────────────────────────────────────────────────────────────
  await Testimonial.insertMany([
    {
      nameAr: 'أم عبدالله', bodyAr: 'تجربة رائعة! ابني تعلّم أحكام التجويد خلال شهرين فقط مع أسلوب المعلم الرائع.',
      rating: 5, isActive: true, sortOrder: 1,
    },
    {
      nameAr: 'محمد العتيبي', bodyAr: 'منصة احترافية وسهلة الاستخدام. المعلمون متخصصون ومتفانون في عملهم.',
      rating: 5, isActive: true, sortOrder: 2,
    },
    {
      nameAr: 'سارة الشمري', bodyAr: 'أنهيت حفظ جزء عمّ في 3 أشهر بفضل المتابعة المستمرة والتقييمات الدقيقة.',
      rating: 5, isActive: true, sortOrder: 3,
    },
    {
      nameAr: 'عمر البقمي', bodyAr: 'أفضل منصة لتعلم القرآن عبر الإنترنت. الجدول مرن والمعلم يتكيف مع احتياجاتي.',
      rating: 4, isActive: true, sortOrder: 4,
    },
  ])
  console.log('✅ Created 4 testimonials')

  // ── FAQs ──────────────────────────────────────────────────────────────────────
  await FAQ.insertMany([
    {
      questionAr: 'ما هي متطلبات التسجيل في المنصة؟',
      answerAr: 'يكفي أن تكون لديك رغبة في تعلم القرآن الكريم! لا يشترط مستوى معين مسبق. نقبل جميع المستويات من المبتدئين حتى المتقدمين.',
      isActive: true, sortOrder: 1,
    },
    {
      questionAr: 'كيف تتم الحصص الدراسية؟',
      answerAr: 'تتم الحصص عبر الإنترنت (Zoom, Google Meet) في أوقات تناسبك. يمكنك اختيار المواعيد التي تلائم جدولك الدراسي أو العملي.',
      isActive: true, sortOrder: 2,
    },
    {
      questionAr: 'هل يمكن تغيير المعلم؟',
      answerAr: 'نعم، إذا لم تكن راضياً عن المعلم أو رأيت أن أسلوبه لا يناسبك، يمكنك طلب تغيير المعلم وسنقوم بذلك فور إشعارنا.',
      isActive: true, sortOrder: 3,
    },
    {
      questionAr: 'ما الفرق بين الباقات؟',
      answerAr: 'تختلف الباقات في عدد الحصص الشهرية ومستوى الدعم المقدم. الباقة الأساسية 8 حصص، والمتقدم 16 حصة، والمتميز 24 حصة مع معلم مخصص.',
      isActive: true, sortOrder: 4,
    },
    {
      questionAr: 'هل توجد تجربة مجانية؟',
      answerAr: 'نعم! نقدم حصة تجريبية مجانية مع أحد معلمينا لتتعرف على أسلوبنا في التعليم قبل الاشتراك.',
      isActive: true, sortOrder: 5,
    },
    {
      questionAr: 'كيف يتم الدفع؟',
      answerAr: 'ندعم وسائل الدفع الإلكترونية المعتمدة (مدى، Visa، Mastercard) وكذلك التحويل البنكي. الدفع آمن ومشفر.',
      isActive: true, sortOrder: 6,
    },
  ])
  console.log('✅ Created 6 FAQs')

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed complete! Demo credentials:')
  console.log('   Admin:    admin@tartelah.com   / Admin1234!')
  console.log('   Teacher1: teacher1@tartelah.com / Teacher1234!')
  console.log('   Teacher2: teacher2@tartelah.com / Teacher1234!')
  console.log('   Student1: student1@tartelah.com / Student1234!')
  console.log('   Student2: student2@tartelah.com / Student1234!')
  console.log('   Student3: student3@tartelah.com / Student1234!\n')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
