const cron = require('node-cron')
const Subscription = require('../models/Subscription')
const Notification = require('../models/Notification')
const { createNotification } = require('../services/notification.service')

async function checkExpiringSubscriptions() {
  const now = new Date()
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const expiringSoon = await Subscription.find({
    status: 'active',
    endDate: { $lte: in3Days, $gte: now },
  }).populate('studentId', 'firstNameAr lastNameAr')

  for (const sub of expiringSoon) {
    const daysLeft = Math.ceil((sub.endDate - now) / (1000 * 60 * 60 * 24))
    const existingNotif = await Notification.findOne({
      userId: sub.studentId._id,
      type: 'subscription',
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      titleAr: { $regex: 'ينتهي اشتراكك' },
    })
    if (!existingNotif) {
      await createNotification({
        userId: sub.studentId._id,
        titleAr: 'ينتهي اشتراكك قريباً',
        bodyAr: `اشتراكك سينتهي خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}. جدّد اشتراكك للاستمرار.`,
        type: 'subscription',
        priority: daysLeft <= 1 ? 'urgent' : 'high',
        relatedId: sub._id,
      })
    }
  }

  const expired = await Subscription.updateMany(
    { status: 'active', endDate: { $lt: now } },
    { $set: { status: 'expired' } }
  )

  if (expired.modifiedCount > 0) {
    console.log(`[CRON] Expired ${expired.modifiedCount} subscriptions`)

    const nowExpired = await Subscription.find({
      status: 'expired',
      endDate: { $gte: new Date(now.getTime() - 25 * 60 * 60 * 1000), $lt: now },
    })

    for (const sub of nowExpired) {
      await createNotification({
        userId: sub.studentId,
        titleAr: 'انتهى اشتراكك',
        bodyAr: 'انتهت صلاحية اشتراكك. تواصل مع الإدارة لتجديده والاستمرار في رحلتك مع القرآن.',
        type: 'subscription',
        priority: 'urgent',
        relatedId: sub._id,
      })
    }
  }
}

function startSubscriptionExpiryJob() {
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
