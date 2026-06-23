const cron = require('node-cron')
const Subscription = require('../models/Subscription')
const Notification = require('../models/Notification')

async function checkExpiringSubscriptions() {
  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // Warn about subscriptions expiring in 3 days
  const expiringSoon = await Subscription.find({
    status: 'active',
    endDate: { $lte: in3Days, $gte: now },
  }).populate('studentId', 'firstNameAr lastNameAr')

  for (const sub of expiringSoon) {
    const daysLeft = Math.ceil((sub.endDate - now) / (1000 * 60 * 60 * 24))
    // Check if we already notified recently (avoid duplicates within same day)
    const existingNotif = await Notification.findOne({
      userId: sub.studentId._id,
      type: 'subscription',
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      titleAr: { $regex: 'ينتهي اشتراكك' },
    })
    if (!existingNotif) {
      await Notification.create({
        userId: sub.studentId._id,
        titleAr: 'ينتهي اشتراكك قريباً',
        bodyAr: `اشتراكك سينتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}. جدّد اشتراكك للاستمرار.`,
        type: 'subscription',
        data: { subscriptionId: sub._id },
      })
    }
  }

  // Expire subscriptions that have passed their end date
  const expired = await Subscription.updateMany(
    { status: 'active', endDate: { $lt: now } },
    { $set: { status: 'expired' } }
  )

  if (expired.modifiedCount > 0) {
    console.log(`[CRON] Expired ${expired.modifiedCount} subscriptions`)

    // Notify newly expired subscriptions
    const nowExpired = await Subscription.find({
      status: 'expired',
      endDate: { $gte: new Date(now.getTime() - 25 * 60 * 60 * 1000), $lt: now },
    })

    for (const sub of nowExpired) {
      await Notification.create({
        userId: sub.studentId,
        titleAr: 'انتهى اشتراكك',
        bodyAr: 'انتهت صلاحية اشتراكك. تواصل مع الإدارة لتجديده والاستمرار في رحلتك مع القرآن.',
        type: 'subscription',
        data: { subscriptionId: sub._id },
      })
    }
  }
}

function startSubscriptionExpiryJob() {
  // Run daily at 00:05 Arabia Standard Time
  cron.schedule('5 0 * * *', async () => {
    try {
      await checkExpiringSubscriptions()
    } catch (err) {
      console.error('[CRON] Subscription expiry error:', err.message)
    }
  }, { timezone: 'Asia/Riyadh' })

  console.log('[CRON] Subscription expiry job started')
}

module.exports = { startSubscriptionExpiryJob }
