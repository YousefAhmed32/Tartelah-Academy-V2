const { extractYouTubeId, isValidYouTubeUrl } = require('../youtube')

const REAL_ID = 'dQw4w9WgXcQ'

describe('extractYouTubeId', () => {
  test.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', REAL_ID],
    ['https://youtube.com/watch?v=dQw4w9WgXcQ', REAL_ID],
    ['https://youtu.be/dQw4w9WgXcQ', REAL_ID],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', REAL_ID],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', REAL_ID],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', REAL_ID], // timestamp param
    ['https://www.youtube.com/watch?list=PLxyz&v=dQw4w9WgXcQ', REAL_ID], // v= after other params
    ['https://youtu.be/dQw4w9WgXcQ?t=10', REAL_ID], // query on a youtu.be short link
  ])('extracts the video id from %s', (url, expected) => {
    expect(extractYouTubeId(url)).toBe(expected)
  })

  test.each([
    [null],
    [undefined],
    [''],
    ['not a url at all'],
    ['https://vimeo.com/12345678'],
    ['https://www.youtube.com/watch?v=too-short'],
    ['https://www.youtube.com/channel/UCxyz'],
  ])('returns null for %s', (url) => {
    expect(extractYouTubeId(url)).toBeNull()
  })
})

describe('isValidYouTubeUrl', () => {
  test('empty/absent is valid — the field is optional', () => {
    expect(isValidYouTubeUrl('')).toBe(true)
    expect(isValidYouTubeUrl(null)).toBe(true)
    expect(isValidYouTubeUrl(undefined)).toBe(true)
  })

  test('a real YouTube URL is valid', () => {
    expect(isValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
  })

  test('a non-YouTube or malformed URL is invalid', () => {
    expect(isValidYouTubeUrl('https://example.com/video')).toBe(false)
    expect(isValidYouTubeUrl('not-a-url')).toBe(false)
  })
})
