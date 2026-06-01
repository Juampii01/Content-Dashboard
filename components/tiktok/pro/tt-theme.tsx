export const TT_TEAL = '#69C9D0'
export const TT_PINK = '#EE1D52'
export const TT_DARK = '#010101'
// TikTok logo gradient: teal shadow + pink shadow layered
export const TT_GRADIENT_CSS = 'bg-[linear-gradient(135deg,#69C9D0_0%,#010101_50%,#EE1D52_100%)]'
export const TT_GRADIENT = 'linear-gradient(135deg, #69C9D0 0%, #010101 50%, #EE1D52 100%)'
// Lighter version for overlays
export const TT_ACCENT_CSS = 'bg-[linear-gradient(135deg,#69C9D0,#EE1D52)]'

export function fmtTT(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
