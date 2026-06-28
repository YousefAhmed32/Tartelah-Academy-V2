const mongoose = require('mongoose')

const AcademySettingsSchema = new mongoose.Schema({
  academyNameAr: { type: String, default: 'ترتيلة للتعليم الإسلامي' },
  academyNameEn: { type: String, default: 'Tartelah Academy' },
  taglineAr: { type: String, default: 'تعلم القرآن الكريم بأيسر الطرق' },
  logoUrl: { type: String },
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
  googleMapsUrl:   { type: String },
  googleMapsEmbed: { type: String },

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
