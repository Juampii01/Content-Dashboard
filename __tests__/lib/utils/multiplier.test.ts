import {
  getMultiplierTier,
  getMultiplierColor,
  getMultiplierBg,
  getScatterColor,
} from '@/lib/utils/multiplier'

describe('getMultiplierTier', () => {
  it('returns normal below 3', () => {
    expect(getMultiplierTier(0)).toBe('normal')
    expect(getMultiplierTier(1)).toBe('normal')
    expect(getMultiplierTier(2.9)).toBe('normal')
  })

  it('returns x3 at exactly 3', () => {
    expect(getMultiplierTier(3)).toBe('x3')
  })

  it('returns x3 between 3 and 5', () => {
    expect(getMultiplierTier(4)).toBe('x3')
    expect(getMultiplierTier(4.9)).toBe('x3')
  })

  it('returns x5 at exactly 5', () => {
    expect(getMultiplierTier(5)).toBe('x5')
  })

  it('returns x5 between 5 and 8', () => {
    expect(getMultiplierTier(6)).toBe('x5')
    expect(getMultiplierTier(7.9)).toBe('x5')
  })

  it('returns x8 at exactly 8', () => {
    expect(getMultiplierTier(8)).toBe('x8')
  })

  it('returns x8 above 8', () => {
    expect(getMultiplierTier(100)).toBe('x8')
  })

  it('handles negative values as normal', () => {
    expect(getMultiplierTier(-1)).toBe('normal')
  })
})

describe('getMultiplierColor', () => {
  it('returns ivory css var for x8 tier', () => {
    expect(getMultiplierColor(8)).toBe('var(--accent-foreground)')
  })

  it('returns accent css var for x5 tier', () => {
    expect(getMultiplierColor(5)).toBe('var(--accent)')
  })

  it('returns gold css var for x3 tier', () => {
    expect(getMultiplierColor(3)).toBe('var(--color-eternity-gold)')
  })

  it('returns muted-foreground css var for normal tier', () => {
    expect(getMultiplierColor(1)).toBe('var(--muted-foreground)')
  })
})

describe('getMultiplierBg', () => {
  it('returns deep css var for x8', () => {
    expect(getMultiplierBg(8)).toBe('var(--color-eternity-deep)')
  })

  it('returns border css var for x5', () => {
    expect(getMultiplierBg(5)).toBe('var(--border)')
  })

  it('returns border css var for x3', () => {
    expect(getMultiplierBg(3)).toBe('var(--border)')
  })

  it('returns muted css var for normal', () => {
    expect(getMultiplierBg(1)).toBe('var(--muted)')
  })
})

describe('getScatterColor', () => {
  it('returns a non-empty css variable string for all tiers', () => {
    const values = [1, 3, 5, 8]
    for (const v of values) {
      const color = getScatterColor(v)
      expect(color).toMatch(/^var\(--/)
    }
  })
})
