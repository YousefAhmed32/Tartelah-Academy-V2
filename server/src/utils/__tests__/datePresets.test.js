const { resolveDatePreset } = require('../datePresets')

describe('resolveDatePreset', () => {
  it('resolves today correctly', () => {
    const res = resolveDatePreset('today')
    expect(res.preset).toBe('today')
    expect(res.label).toBe('اليوم')
    expect(res.start.getHours()).toBe(0)
    expect(res.end.getHours()).toBe(23)
    expect(res.compStart).toBeDefined()
    expect(res.compEnd).toBeDefined()
  })

  it('resolves yesterday correctly', () => {
    const res = resolveDatePreset('yesterday')
    expect(res.preset).toBe('yesterday')
    expect(res.label).toBe('أمس')
    expect(res.start.getHours()).toBe(0)
    expect(res.end.getHours()).toBe(23)
  })

  it('resolves this_week correctly', () => {
    const res = resolveDatePreset('this_week')
    expect(res.preset).toBe('this_week')
    expect(res.label).toBe('هذا الأسبوع')
    expect(res.start).toBeInstanceOf(Date)
    expect(res.end).toBeInstanceOf(Date)
  })

  it('resolves this_month correctly as default', () => {
    const res = resolveDatePreset()
    expect(res.preset).toBe('this_month')
    expect(res.label).toBe('هذا الشهر')
    expect(res.start.getDate()).toBe(1)
  })

  it('resolves last_month correctly', () => {
    const res = resolveDatePreset('last_month')
    expect(res.preset).toBe('last_month')
    expect(res.label).toBe('الشهر السابق')
    expect(res.start.getDate()).toBe(1)
  })

  it('resolves custom range correctly', () => {
    const res = resolveDatePreset('custom', '2026-05-01', '2026-05-10')
    expect(res.preset).toBe('custom')
    expect(res.label).toBe('فترة مخصصة')
    expect(res.start.getFullYear()).toBe(2026)
    expect(res.start.getMonth()).toBe(4) // May
    expect(res.start.getDate()).toBe(1)
    expect(res.end.getFullYear()).toBe(2026)
    expect(res.end.getMonth()).toBe(4) // May
    expect(res.end.getDate()).toBe(10)
    expect(res.compStart).toBeInstanceOf(Date)
    expect(res.compEnd).toBeInstanceOf(Date)
  })

  it('falls back to this_month if custom range is invalid', () => {
    const res = resolveDatePreset('custom', 'invalid-date', 'not-a-date')
    expect(res.preset).toBe('this_month')
  })
})
