export function formatDate(
  date: Date | string,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-ES', opts)
}
