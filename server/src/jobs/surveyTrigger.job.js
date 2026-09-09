const cron = require('node-cron')
const surveyService = require('../services/survey.service')
const { DEFAULT_ACADEMY_TIMEZONE } = require('../config/academyTimezone')

// Creates a pending evaluation/renewal survey for every subscription
// entering its administrator-configurable lead window before expiry
// (Phase 2 §13 — AcademySettings.surveyLeadDays, default 7). Runs daily;
// idempotent (Survey's unique subscriptionId index means a subscription
// already surveyed for this cycle is silently skipped every subsequent run).
function startSurveyTriggerJob() {
  cron.schedule('30 0 * * *', async () => {
    try {
      const result = await surveyService.triggerDueSurveys()
      if (result.created > 0) console.log(`[CRON] Surveys triggered: ${result.created}/${result.checked} due subscriptions`)
    } catch (err) {
      console.error('[CRON] Survey trigger error:', err.message)
    }
  // See monthlyReport.job.js — matches the academy's Africa/Cairo default
  // instead of the legacy 'Asia/Riyadh' cron-trigger timezone.
  }, { timezone: DEFAULT_ACADEMY_TIMEZONE })

  console.log('[CRON] Survey trigger job started')
}

module.exports = { startSurveyTriggerJob }
