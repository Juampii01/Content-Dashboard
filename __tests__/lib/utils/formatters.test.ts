import { formatK, formatM, formatPercent, formatMultiplier } from '@/lib/utils/formatters'

describe('formatK', () => {
  it('returns plain string for numbers below 1000', () => {
    expect(formatK(0)).toBe('0')
    expect(formatK(999)).toBe('999')
    expect(formatK(500)).toBe('500')
  })

  it('formats thousands with K suffix', () => {
    expect(formatK(1000)).toBe('1.0K')
    expect(formatK(1500)).toBe('1.5K')
    expect(formatK(999999)).toBe('1000.0K')
  })

  it('formats millions with M suffix', () => {
    expect(formatK(1_000_000)).toBe('1.0M')
    expect(formatK(2_500_000)).toBe('2.5M')
  })

  it('handles boundary at exactly 1000', () => {
    expect(formatK(1000)).toBe('1.0K')
  })

  it('handles boundary at exactly 1_000_000', () => {
    expect(formatK(1_000_000)).toBe('1.0M')
  })

  it('handles negative numbers', () => {
    expect(formatK(-500)).toBe('-500')
  })
})

describe('formatM', () => {
  it('returns plain string below 1000', () => {
    expect(formatM(0)).toBe('0')
    expect(formatM(750)).toBe('750')
  })

  it('formats thousands as K (no decimal)', () => {
    expect(formatM(1000)).toBe('1K')
    expect(formatM(1500)).toBe('2K')
  })

  it('formats millions with M', () => {
    expect(formatM(1_000_000)).toBe('1.0M')
    expect(formatM(3_700_000)).toBe('3.7M')
  })
})

describe('formatPercent', () => {
  it('formats with one decimal by default', () => {
    expect(formatPercent(12.345)).toBe('12.3%')
    expect(formatPercent(0)).toBe('0.0%')
    expect(formatPercent(100)).toBe('100.0%')
  })

  it('respects custom decimal places', () => {
    expect(formatPercent(3.14159, 2)).toBe('3.14%')
    expect(formatPercent(50, 0)).toBe('50%')
  })

  it('handles negative values', () => {
    expect(formatPercent(-5.5)).toBe('-5.5%')
  })
})

describe('formatMultiplier', () => {
  it('prefixes with × and formats one decimal', () => {
    expect(formatMultiplier(1)).toBe('×1.0')
    expect(formatMultiplier(3)).toBe('×3.0')
    expect(formatMultiplier(8.5)).toBe('×8.5')
  })

  it('handles zero', () => {
    expect(formatMultiplier(0)).toBe('×0.0')
  })
})
