export const YT_RED = '#FF0000'
export const YT_DARK_RED = '#CC0000'
export const YT_GRADIENT = 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)'
export const YT_GRADIENT_CSS = 'bg-[linear-gradient(135deg,#FF0000_0%,#CC0000_100%)]'

/** 1.2M / 123K / raw. Subscriber-style: floor at thousands, strip trailing .0 */
export function fmtSubs(n: number): string {
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(1).replace(/\.0$/, '')
    return v + 'M'
  }
  if (n >= 1_000) {
    return Math.floor(n / 1_000) + 'K'
  }
  return String(n)
}

/** 1.2B / 1.2M / 1.2K / raw */
export function fmtViews(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

/** h:mm:ss when there are hours, else m:ss */
export function fmtDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}
