/**
 * Production content seed: the real subscription packages currently offered
 * on the platform (Silver/Gold/Diamond), sourced from datatoadd.md via
 * server/src/scripts/seedRealContent.js. Idempotent — matched by `nameAr`,
 * existing packages are never overwritten.
 */
const Package = require('../../models/Package')

const PACKAGES = [
  {
    nameAr: 'الباقة الفضية', name: 'Silver Package',
    descriptionAr: 'ثلاث حلقات أسبوعيًا — بداية مثالية لرحلتك القرآنية.',
    price: 120, currency: 'EGP', durationDays: 30, sessionsPerMonth: 12,
    featuresAr: ['📖 ثلاث حلقات أسبوعيًا', '🗓️ اثنتا عشرة حلقة شهريًا', '⏳ مدة الحلقة: 30 دقيقة', 'معلمون ومعلمات مؤهلون بإشراف أكاديمي متميز', 'متابعة ومراجعة مستمرة لقياس التقدم'],
    isActive: true, isPopular: false, sortOrder: 0,
  },
  {
    nameAr: 'الباقة الذهبية', name: 'Gold Package',
    descriptionAr: 'أربع حلقات أسبوعيًا — للمتابعة الأكثر كثافة وتقدمًا أسرع.',
    price: 150, currency: 'EGP', durationDays: 30, sessionsPerMonth: 16,
    featuresAr: ['📖 أربع حلقات أسبوعيًا', '🗓️ ست عشرة حلقة شهريًا', '⏳ مدة الحلقة: 30 دقيقة', 'معلمون ومعلمات مؤهلون بإشراف أكاديمي متميز', 'متابعة ومراجعة مستمرة لقياس التقدم'],
    isActive: true, isPopular: true, sortOrder: 1,
  },
  {
    nameAr: 'الباقة الماسية', name: 'Diamond Package',
    descriptionAr: 'خمس حلقات أسبوعيًا — أعلى معدل تلقٍ ومتابعة لصحبة القرآن.',
    price: 180, currency: 'EGP', durationDays: 30, sessionsPerMonth: 20,
    featuresAr: ['📖 خمس حلقات أسبوعيًا', '🗓️ عشرون حلقة شهريًا', '⏳ مدة الحلقة: 30 دقيقة', 'معلمون ومعلمات مؤهلون بإشراف أكاديمي متميز', 'متابعة ومراجعة مستمرة لقياس التقدم'],
    isActive: true, isPopular: false, sortOrder: 2,
  },
]

async function seedPackages() {
  let created = 0
  let skipped = 0
  for (const pkg of PACKAGES) {
    const exists = await Package.findOne({ nameAr: pkg.nameAr })
    if (exists) { skipped++; continue }
    await Package.create(pkg)
    created++
  }
  return { total: PACKAGES.length, created, skipped }
}

module.exports = { seedPackages, PACKAGES }
