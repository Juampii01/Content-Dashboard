export type MultiplierTier = 'normal' | 'x3' | 'x5' | 'x8'

export function getMultiplierTier(multiplier: number): MultiplierTier {
  if (multiplier >= 8) return 'x8'
  if (multiplier >= 5) return 'x5'
  if (multiplier >= 3) return 'x3'
  return 'normal'
}

export function getMultiplierColor(multiplier: number): string {
  const tier = getMultiplierTier(multiplier)
  switch (tier) {
    case 'x8': return 'var(--accent-foreground)'   // ivory — outlier
    case 'x5': return 'var(--accent)'              // accent-primary
    case 'x3': return 'var(--color-eternity-gold)' // gold
    default:   return 'var(--muted-foreground)'    // muted
  }
}

export function getMultiplierBg(multiplier: number): string {
  const tier = getMultiplierTier(multiplier)
  switch (tier) {
    case 'x8': return 'var(--color-eternity-deep)' // deep wine bg
    case 'x5': return 'var(--border)'
    case 'x3': return 'var(--border)'
    default:   return 'var(--muted)'
  }
}

export function getScatterColor(multiplier: number): string {
  const tier = getMultiplierTier(multiplier)
  switch (tier) {
    case 'x8': return 'var(--color-eternity-gold)'
    case 'x5': return 'var(--accent)'
    case 'x3': return 'var(--destructive)'
    default:   return 'var(--chart-5)'
  }
}
