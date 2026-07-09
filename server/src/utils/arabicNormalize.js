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

module.exports = { normalizeArabic }
