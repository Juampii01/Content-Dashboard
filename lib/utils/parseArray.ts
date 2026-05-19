/**
 * Safely parses an unknown value into string[].
 * Handles: already-an-array, JSON string, or returns [].
 */
export function tryParseArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string')
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) return p.filter((x): x is string => typeof x === 'string')
    } catch {
      // not valid JSON — ignore
    }
  }
  return []
}
