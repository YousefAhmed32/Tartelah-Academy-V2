// Lightweight Arabic normalization for keyword matching against the curated
// AI knowledge file — NOT used to rewrite MongoDB queries (Mongo regex search
// stays as-is; the LLM itself handles Arabic morphology far better than a
// regex normalizer when it extracts tool-call search terms). This only helps
// exact/substring matching where there's no LLM in the loop.
function normalizeArabic(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')   // strip tashkeel/diacritics
    .replace(/[إأآا]/g, 'ا')                                // alef variants
    .replace(/ى/g, 'ي')                                     // alef maksura -> ya
    .replace(/ة/g, 'ه')                                     // ta marbuta -> ha
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function normalizeArabicDigits(str) {
  if (!str || typeof str !== 'string') return ''
  return str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
}

function toArabicDigits(str) {
  if (!str || typeof str !== 'string') return ''
  return str.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])
}

function cleanEmail(val) {
  return (val || '')
    .replace(/[\s\u200B-\u200D\uFEFF\u00A0\u200E\u200F]/g, '')
    .trim()
    .toLowerCase()
}

module.exports = { normalizeArabic, normalizeArabicDigits, toArabicDigits, cleanEmail }
