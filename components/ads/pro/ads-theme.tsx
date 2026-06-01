// Meta Ads Pro — brand tokens and formatting helpers

export const META_BLUE = '#1877F2'
export const META_DARK_BLUE = '#0866FF'
export const META_GREEN = '#42B72A'  // success/active
export const META_GRADIENT_CSS = 'bg-[linear-gradient(135deg,#1877F2_0%,#0866FF_100%)]'
export const META_GRADIENT = 'linear-gradient(135deg, #1877F2 0%, #0866FF 100%)'

export function fmtSpend(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + n.toFixed(2)
}

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(Math.round(n))
}

export function fmtPct(n: number): string {
  return n.toFixed(2) + '%'
}
