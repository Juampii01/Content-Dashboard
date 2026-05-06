import { stripHtml } from '@/lib/utils/stripHtml'

describe('stripHtml', () => {
  describe('basic tag stripping', () => {
    it('strips a single wrapping paragraph tag', () => {
      expect(stripHtml('<p>hello</p>')).toBe('hello')
    })

    it('strips nested tags', () => {
      expect(stripHtml('<div><span>text</span></div>')).toBe('text')
    })

    it('strips inline tags inside a sentence', () => {
      expect(stripHtml('hello <b>world</b>')).toBe('hello world')
    })

    it('strips self-closing tags', () => {
      expect(stripHtml('line1<br/>line2')).toBe('line1 line2')
    })
  })

  describe('no-op cases', () => {
    it('returns a plain string unchanged', () => {
      expect(stripHtml('just plain text')).toBe('just plain text')
    })

    it('returns empty string for empty input', () => {
      expect(stripHtml('')).toBe('')
    })
  })

  describe('whitespace normalisation', () => {
    it('collapses multiple spaces produced by tag removal', () => {
      expect(stripHtml('<p>  spaced  </p>')).toBe('spaced')
    })

    it('trims leading and trailing whitespace', () => {
      expect(stripHtml('  <em>trimmed</em>  ')).toBe('trimmed')
    })
  })

  describe('null / undefined handling', () => {
    it('returns empty string for null input (falsy guard)', () => {
      // stripHtml returns '' for any falsy value via the `if (!html)` guard
      expect(stripHtml(null as unknown as string)).toBe('')
    })

    it('returns empty string for undefined input (falsy guard)', () => {
      expect(stripHtml(undefined as unknown as string)).toBe('')
    })
  })
})
