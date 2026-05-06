import { formatDate } from '@/lib/utils/formatDate'

describe('formatDate', () => {
  describe('happy path', () => {
    it('formats a Date object with default options (day + short month in Spanish)', () => {
      const result = formatDate(new Date(2024, 2, 15))
      expect(result).toBe('15 mar')
    })

    it('formats an ISO string date', () => {
      // Include an explicit local time to avoid timezone-boundary surprises:
      // `new Date('2024-07-04')` parses as UTC midnight and drifts a day
      // in negative UTC offsets (e.g. Americas). `T12:00:00` (no Z) is local.
      const result = formatDate('2024-07-04T12:00:00')
      expect(result).toBe('4 jul')
    })

    it('accepts custom Intl options', () => {
      const result = formatDate(new Date(2024, 0, 1), { year: 'numeric', month: 'long', day: 'numeric' })
      expect(result).toBe('1 de enero de 2024')
    })
  })

  describe('boundary values', () => {
    it('handles first day of year', () => {
      const result = formatDate(new Date(2024, 0, 1))
      expect(result).toBe('1 ene')
    })

    it('handles last day of year', () => {
      const result = formatDate(new Date(2024, 11, 31))
      expect(result).toBe('31 dic')
    })

    it('handles leap day Feb 29', () => {
      const result = formatDate(new Date(2024, 1, 29))
      expect(result).toBe('29 feb')
    })
  })

  describe('edge cases', () => {
    it('handles string with time component', () => {
      const result = formatDate('2024-06-15T14:30:00Z')
      expect(result).toBe('15 jun')
    })
  })
})
