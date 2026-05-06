function formatCompact(n: number, kDecimals: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(kDecimals)}K`
  return n.toString()
}

export function formatK(n: number): string {
  return formatCompact(n, 1)
}

export function formatM(n: number): string {
  return formatCompact(n, 0)
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`
}

export function formatMultiplier(n: number): string {
  return `×${n.toFixed(1)}`
}
