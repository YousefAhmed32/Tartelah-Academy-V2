const mongoose = require('mongoose')

const AcademySettingsSchema = new mongoose.Schema({
  academyNameAr: { type: String, default: 'ترتيلة للتعليم الإسلامي' },
  academyNameEn: { type: String, default: 'Tartelah Academy' },
  taglineAr: { type: String, default: 'تعلم القرآن الكريم بأيسر الطرق' },
  // GridFS file _id — new field (no prior logo upload existed), so a clean
  // *Id name is used with no legacy compatibility constraint.
  logoId: { type: mongoose.Schema.Types.ObjectId, default: null },
  phone: { type: String, default: '+20 105 040 0096' },
  whatsapp: { type: String, default: '966567443805' },
  email: { type: String, default: 'tartela.online@gmail.com' },
  address: { type: String },
  facebook: { type: String },
  instagram: { type: String },
  twitter: { type: String },
  youtube: { type: String, default: '@tartela.2online' },
  linkedin: { type: String },

  // Contact & Support
  workingHours:    { type: String, default: 'السبت – الخميس: 9:00 ص – 9:00 م' },
  supportText:     { type: String, default: 'نحن هنا لمساعدتك في أي وقت' },
  emergencyContact:{ type: String },
  googleMapsEmbed: { type: String },

  // Identity — Mission / Vision / About (public "من نحن" content, admin-editable)
  missionQuoteAr: { type: String, default: 'سُئلت السيدة عائشة (رضي الله عنها) عن خلق النبي صلى الله عليه وسلم فقالت: (( كان خلقه القرآن ))' },
  visionAr:       { type: String, default: 'إعداد جيل قرآني متميز — كان صلى الله عليه وسلم: قرآنا يمشي على الأرض' },
  aboutHeadlineAr:{ type: String, default: 'ترتيـلة Online' },
  aboutBodyAr:    { type: String, default: 'أكاديمية قرآنية متخصصة في تعليم القرآن الكريم وأحكام التجويد واللغة العربية والعلوم الشرعية عن بُعد، بمنهجية علمية وإشراف أكاديمي متميز 🤍📖\n\n✨ نؤمن أن القرآن منهج حياة ونسعى إلى غرسه حفظًا وتلاوةً وفهمًا في نفوس طلابنا\n\n🤍 ترتيـلة Online ... حيث يبدأ الإتقان وتزدهر صحبة القرآن' },

  // Footer
  footerDescription:   { type: String, default: 'منصة ترتيلة أونلاين — وجهتك الأولى لتعلم القرآن الكريم بإتقان مع أفضل المعلمين' },
  footerCopyright:     { type: String, default: '© 2026 ترتيلة أونلاين — جميع الحقوق محفوظة' },
  privacyPolicyUrl:    { type: String },
  termsUrl:            { type: String },
  cookiesPolicyUrl:    { type: String },
  newsletterEnabled:   { type: Boolean, default: true },
  newsletterText:      { type: String, default: 'اشترك في نشرتنا للحصول على أحدث المقالات والدروس' },

  // Technical
  zoomClientId: { type: String },
  googleMeetEnabled: { type: Boolean, default: true },
  smtpHost: { type: String },
  smtpPort: { type: String },
  smtpUser: { type: String },
  smtpPass: { type: String, select: false },
  maintenanceMode: { type: Boolean, default: false },
  maintenanceMessage: { type: String },
}, { timestamps: true })

// Singleton — always _id = 'global'
module.exports = mongoose.model('AcademySettings', AcademySettingsSchema)
