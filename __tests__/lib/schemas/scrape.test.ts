import { ScrapeRequestSchema } from '@/lib/schemas/analizador/scrape'

describe('ScrapeRequestSchema', () => {
  describe('happy path', () => {
    it('accepts valid username and limit', () => {
      const result = ScrapeRequestSchema.safeParse({ username: 'johndoe', limit: 10 })
      expect(result.success).toBe(true)
    })

    it('accepts minimum valid values', () => {
      const result = ScrapeRequestSchema.safeParse({ username: 'a', limit: 1 })
      expect(result.success).toBe(true)
    })

    it('accepts maximum valid values', () => {
      // Instagram usernames max at 30 chars; schema enforces z.string().max(30)
      const result = ScrapeRequestSchema.safeParse({ username: 'x'.repeat(30), limit: 50 })
      expect(result.success).toBe(true)
    })
  })

  describe('failure cases — missing required fields', () => {
    it('fails when username is missing', () => {
      const result = ScrapeRequestSchema.safeParse({ limit: 5 })
      expect(result.success).toBe(false)
    })

    it('fails when limit is missing', () => {
      const result = ScrapeRequestSchema.safeParse({ username: 'johndoe' })
      expect(result.success).toBe(false)
    })

    it('fails on empty object', () => {
      const result = ScrapeRequestSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('failure cases — wrong type', () => {
    it('fails when username is a number', () => {
      const result = ScrapeRequestSchema.safeParse({ username: 123, limit: 5 })
      expect(result.success).toBe(false)
    })

    it('fails when limit is a string', () => {
      const result = ScrapeRequestSchema.safeParse({ username: 'abc', limit: 'ten' })
      expect(result.success).toBe(false)
    })

    it('fails when limit is null', () => {
      const result = ScrapeRequestSchema.safeParse({ username: 'abc', limit: null })
      expect(result.success).toBe(false)
    })
  })

  describe('failure cases — out of range', () => {
    it('fails when username is empty string', () => {
      const result = ScrapeRequestSchema.safeParse({ username: '', limit: 5 })
      expect(result.success).toBe(false)
    })

    it('fails when username exceeds 100 chars', () => {
      const result = ScrapeRequestSchema.safeParse({ username: 'x'.repeat(101), limit: 5 })
      expect(result.success).toBe(false)
    })

    it('fails when limit is 0', () => {
      const result = ScrapeRequestSchema.safeParse({ username: 'abc', limit: 0 })
      expect(result.success).toBe(false)
    })

    it('fails when limit exceeds 50', () => {
      const result = ScrapeRequestSchema.safeParse({ username: 'abc', limit: 51 })
      expect(result.success).toBe(false)
    })

    it('fails when limit is a float', () => {
      const result = ScrapeRequestSchema.safeParse({ username: 'abc', limit: 2.5 })
      expect(result.success).toBe(false)
    })
  })
})
