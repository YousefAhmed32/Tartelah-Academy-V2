const Joi = require('joi')

const ar = Joi.string().trim()
const email = Joi.string().email({ tlds: { allow: false } }).lowercase().trim()
const password = Joi.string().min(8).max(64)

exports.registerSchema = Joi.object({
  firstNameAr: ar.min(2).max(30).required().messages({ 'string.empty': 'الاسم الأول مطلوب', 'string.min': 'الاسم الأول يجب أن يكون حرفين على الأقل' }),
  lastNameAr:  ar.min(2).max(30).required().messages({ 'string.empty': 'اسم العائلة مطلوب' }),
  firstName:   ar.max(50).optional().allow(''),
  lastName:    ar.max(50).optional().allow(''),
  email:       email.required().messages({ 'string.email': 'بريد إلكتروني غير صالح', 'string.empty': 'البريد الإلكتروني مطلوب' }),
  password:    password.required().messages({ 'string.min': 'كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'string.empty': 'كلمة المرور مطلوبة' }),
  phone:       Joi.string().trim().max(20).optional().allow(''),
  role:        Joi.string().valid('student', 'teacher').default('student'),
})

exports.loginSchema = Joi.object({
  email:    email.required().messages({ 'string.email': 'بريد إلكتروني غير صالح', 'string.empty': 'البريد الإلكتروني مطلوب' }),
  password: password.required().messages({ 'string.empty': 'كلمة المرور مطلوبة' }),
})

exports.forgotPasswordSchema = Joi.object({
  email: email.required(),
})

exports.resetPasswordSchema = Joi.object({
  token:    Joi.string().required(),
  password: password.required().messages({ 'string.min': 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }),
})

exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword:     password.required().messages({ 'string.min': 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل' }),
})

exports.createSessionSchema = Joi.object({
  teacherId:       Joi.string().hex().length(24).required().messages({ 'string.empty': 'يجب تحديد المعلم' }),
  studentId:       Joi.string().hex().length(24).required().messages({ 'string.empty': 'يجب تحديد الطالب' }),
  titleAr:         ar.max(150).optional().allow(''),
  scheduledAt:     Joi.date().iso().min('now').required().messages({ 'date.min': 'لا يمكن جدولة حصة في الماضي', 'any.required': 'تاريخ ووقت الحصة مطلوب' }),
  durationMinutes: Joi.number().integer().min(15).max(180).default(60),
  meetingLink:     Joi.string().uri().max(500).optional().allow(''),
  meetingProvider: Joi.string().valid('zoom', 'meet', 'teams', 'other', 'custom').default('zoom'),
  notesAr:         ar.max(500).optional().allow(''),
})

exports.createHomeworkSchema = Joi.object({
  titleAr:     ar.min(2).max(200).required().messages({ 'string.empty': 'عنوان الواجب مطلوب' }),
  descriptionAr: ar.max(1000).optional().allow(''),
  assignedTo:  Joi.array().items(Joi.string().hex().length(24)).min(1).required().messages({ 'array.min': 'يجب اختيار طالب على الأقل' }),
  dueDate:     Joi.date().iso().required().messages({ 'any.required': 'تاريخ الاستحقاق مطلوب' }),
})

exports.broadcastSchema = Joi.object({
  titleAr:  ar.min(2).max(200).required().messages({ 'string.empty': 'عنوان الإشعار مطلوب' }),
  bodyAr:   ar.min(2).max(1000).required().messages({ 'string.empty': 'نص الإشعار مطلوب' }),
  target:   Joi.string().valid('all', 'students', 'teachers').default('all'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
})
