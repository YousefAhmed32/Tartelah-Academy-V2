const nodemailer = require('nodemailer')

let transporter = null

function getTransporter() {
  if (transporter) return transporter
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return transporter
}

const FROM = process.env.EMAIL_FROM || 'ترتيلة أونلاين <noreply@tartelah.com>'

async function sendMail({ to, subject, html }) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com') {
    console.log(`[EMAIL-SKIP] To: ${to} | Subject: ${subject}`)
    return
  }
  try {
    await getTransporter().sendMail({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[EMAIL-ERROR]', err.message)
  }
}

const LOGO_URL = 'https://tartelah.com/logo.png'
const BRAND_GOLD = '#E8C76A'
const BRAND_DARK = '#0f0226'

function baseTemplate(title, body) {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f6f4fb;font-family:Cairo,Tahoma,Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:${BRAND_DARK};padding:32px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:${BRAND_GOLD};letter-spacing:1px;">ترتيلة أونلاين</div>
            <div style="font-size:13px;color:rgba(232,199,106,0.7);margin-top:4px;">أكاديمية القرآن الكريم</div>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:40px 48px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f6f4fb;padding:24px;text-align:center;">
            <p style="color:#b3a4d0;font-size:12px;margin:0;">هذا البريد أُرسل تلقائياً — لا تردّ عليه</p>
            <p style="color:#b3a4d0;font-size:12px;margin:4px 0 0;">جميع الحقوق محفوظة © ${new Date().getFullYear()} ترتيلة أونلاين</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

exports.sendWelcomeEmail = async ({ to, name }) => {
  const body = `
    <h2 style="color:#0f0226;font-size:22px;margin:0 0 16px;">أهلاً وسهلاً، ${name}! 🌟</h2>
    <p style="color:#1f1147;font-size:15px;line-height:1.8;margin:0 0 20px;">
      يسعدنا انضمامك إلى <strong style="color:#7c3aed;">ترتيلة أونلاين</strong>، المنصة المتخصصة في تعليم القرآن الكريم بأحكام التجويد على يد نخبة من المعلمين المعتمدين.
    </p>
    <div style="background:#f6f4fb;border-right:4px solid #E8C76A;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
      <p style="color:#1f1147;font-size:14px;margin:0;">
        ﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلاً ﴾ — المزمل: ٤
      </p>
    </div>
    <p style="color:#1f1147;font-size:15px;line-height:1.8;margin:0 0 28px;">يمكنك الآن تسجيل الدخول والبدء برحلتك مع القرآن الكريم.</p>
    <div style="text-align:center;">
      <a href="${process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/login"
         style="display:inline-block;background:#E8C76A;color:#0f0226;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
        الدخول إلى حسابي
      </a>
    </div>`
  await sendMail({ to, subject: `أهلاً بك في ترتيلة أونلاين، ${name}!`, html: baseTemplate('أهلاً بك', body) })
}

exports.sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const body = `
    <h2 style="color:#0f0226;font-size:22px;margin:0 0 16px;">إعادة تعيين كلمة المرور</h2>
    <p style="color:#1f1147;font-size:15px;line-height:1.8;margin:0 0 20px;">
      مرحباً <strong>${name}</strong>، تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك في ترتيلة أونلاين.
    </p>
    <p style="color:#1f1147;font-size:15px;line-height:1.8;margin:0 0 24px;">
      اضغط على الزر أدناه لإعادة تعيين كلمة المرور. الرابط صالح لمدة <strong>30 دقيقة</strong> فقط.
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${resetUrl}"
         style="display:inline-block;background:#7c3aed;color:#ffffff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
        إعادة تعيين كلمة المرور
      </a>
    </div>
    <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:14px 18px;margin-bottom:8px;">
      <p style="color:#856404;font-size:13px;margin:0;">
        ⚠️ إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد وحسابك بخير.
      </p>
    </div>`
  await sendMail({ to, subject: 'إعادة تعيين كلمة المرور — ترتيلة أونلاين', html: baseTemplate('إعادة تعيين كلمة المرور', body) })
}

exports.sendPasswordChangedEmail = async ({ to, name }) => {
  const body = `
    <h2 style="color:#0f0226;font-size:22px;margin:0 0 16px;">تم تغيير كلمة المرور ✅</h2>
    <p style="color:#1f1147;font-size:15px;line-height:1.8;margin:0 0 20px;">
      مرحباً <strong>${name}</strong>، تم تغيير كلمة مرور حسابك في ترتيلة أونلاين بنجاح.
    </p>
    <div style="background:#d4edda;border:1px solid #28a745;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="color:#155724;font-size:13px;margin:0;">إذا لم تقم أنت بهذا التغيير، يرجى التواصل مع الدعم فوراً.</p>
    </div>
    <div style="text-align:center;">
      <a href="${process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173'}/login"
         style="display:inline-block;background:#E8C76A;color:#0f0226;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
        تسجيل الدخول
      </a>
    </div>`
  await sendMail({ to, subject: 'تم تغيير كلمة المرور — ترتيلة أونلاين', html: baseTemplate('تغيير كلمة المرور', body) })
}

exports.sendSessionReminderEmail = async ({ to, name, sessionTitle, scheduledAt, meetingLink }) => {
  const dateStr = new Date(scheduledAt).toLocaleString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const body = `
    <h2 style="color:#0f0226;font-size:22px;margin:0 0 16px;">تذكير: حصتك القادمة 📚</h2>
    <p style="color:#1f1147;font-size:15px;line-height:1.8;margin:0 0 20px;">
      مرحباً <strong>${name}</strong>، هذا تذكير بموعد حصتك القادمة.
    </p>
    <div style="background:#f6f4fb;border-right:4px solid #7c3aed;padding:16px 20px;border-radius:8px;margin-bottom:24px;">
      <p style="color:#1f1147;font-size:14px;margin:0 0 8px;"><strong>الحصة:</strong> ${sessionTitle}</p>
      <p style="color:#1f1147;font-size:14px;margin:0;"><strong>الموعد:</strong> ${dateStr}</p>
    </div>
    ${meetingLink ? `
    <div style="text-align:center;">
      <a href="${meetingLink}"
         style="display:inline-block;background:#7c3aed;color:#ffffff;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;">
        الانضمام إلى الحصة
      </a>
    </div>` : ''}`
  await sendMail({ to, subject: `تذكير: حصة "${sessionTitle}" قريباً`, html: baseTemplate('تذكير بالحصة', body) })
}
