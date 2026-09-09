const cron = require('node-cron')
const monthlyReportService = require('../services/monthlyReport.service')
const { getAcademyTimezone } = require('../services/academySettings.service')
const { DEFAULT_ACADEMY_TIMEZONE } = require('../config/academyTimezone')

// Auto-creates every active teacher's monthly report draft the moment the
// month closes (Phase 2 §12 — "automatically create a draft after the
// month closes, using the academy timezone"). Runs early on the 1st of
// each month; a teacher whose report was already generated (e.g. by an
// earlier manual admin generation) is safely skipped by
// generateReport's own idempotent get-or-create + "never touch a
// submitted+ report" guard.
async function generatePreviousMonthDrafts() {
  const timezone = await getAcademyTimezone()
  const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
  const prevMonthDate = new Date(nowInTz.getFullYear(), nowInTz.getMonth() - 1, 1)
  const year = prevMonthDate.getFullYear()
  const month = prevMonthDate.getMonth() + 1

  const result = await monthlyReportService.generateAllForMonth(year, month, { isSystem: true })
  console.log(`[CRON] Monthly teacher reports generated for ${year}-${month}: ${result.created}/${result.attempted} (${result.failed} failed)`)
}

function startMonthlyReportJob() {
  // 00:10 on day 1 of every month — comfortably after midnight so the
  // "previous month" boundary has fully settled even accounting for the
  // academy timezone offset from the server's own clock.
  cron.schedule('10 0 1 * *', async () => {
    try {
      await generatePreviousMonthDrafts()
    } catch (err) {
      console.error('[CRON] Monthly teacher report generation error:', err.message)
    }
  // Matches the academy's own timezone default (config/academyTimezone.js) —
  // was previously the legacy 'Asia/Riyadh' default that predates the
  // Africa/Cairo academy-wide setting, silently shifting this "month closes"
  // trigger up to an hour off the timezone generatePreviousMonthDrafts()
  // itself uses for the actual month-boundary math above.
  }, { timezone: DEFAULT_ACADEMY_TIMEZONE })

  console.log('[CRON] Monthly teacher report job started')
}

module.exports = { startMonthlyReportJob, generatePreviousMonthDrafts }
