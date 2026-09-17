export const EMPTY_QURAN_REPORT_FIELDS = {
  todayRecitation: '',
  todayRevision: '',
  nextRecitation: '',
  nextRevision: '',
  nextManners: '',
  nextTajweed: '',
  quranLink: '',
  memorizationLevel: 'excellent',
  revisionLevel: 'excellent',
  tajweedLevel: 'excellent',
  engagementLevel: 'excellent',
  generalEvaluation: '',
  parentNotes: '',
  importantAlert: '',
}

export function isQuranReportReady(fields) {
  return Boolean(fields?.todayRecitation?.trim() || fields?.todayRevision?.trim())
}
