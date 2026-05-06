/** Formatea un coste en USD de forma consistente. */
export function formatCostUsd(usd: number, opts?: { withDollarSign?: boolean }): string {
  const dollar = opts?.withDollarSign ?? true
  const prefix = dollar ? '$' : ''
  if (!Number.isFinite(usd) || usd < 0) return `${prefix}0.00`
  if (usd < 0.01) return `<${prefix}0.01`
  if (usd < 1)    return `${prefix}${usd.toFixed(3)}`
  return `${prefix}${usd.toFixed(2)}`
}
