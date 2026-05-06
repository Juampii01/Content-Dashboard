import { AnalyzeRequestSchema } from '@/lib/schemas/analizador/analyze'

describe('AnalyzeRequestSchema', () => {
  describe('happy path', () => {
    it('accepts caption only', () => {
      const result = AnalyzeRequestSchema.safeParse({ caption: 'Hello world' })
      expect(result.success).toBe(true)
    })

    it('accepts transcript only', () => {
      const result = AnalyzeRequestSchema.safeParse({ transcript: 'Some transcript text' })
      expect(result.success).toBe(true)
    })

    it('accepts all optional fields together', () => {
      const result = AnalyzeRequestSchema.safeParse({
        caption: 'A caption',
        transcript: 'A transcript',
        views: 1000,
        likes: 50,
        comments: 5,
      })
      expect(result.success).toBe(true)
    })

    it('accepts zero values for numeric fields', () => {
      const result = AnalyzeRequestSchema.safeParse({
        caption: 'text',
        views: 0,
        likes: 0,
        comments: 0,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('failure cases', () => {
    it('fails when neither caption nor transcript provided', () => {
      const result = AnalyzeRequestSchema.safeParse({ views: 100 })
      expect(result.success).toBe(false)
    })

    it('fails when caption exceeds 5000 chars', () => {
      const result = AnalyzeRequestSchema.safeParse({ caption: 'x'.repeat(5001) })
      expect(result.success).toBe(false)
    })

    it('fails when transcript exceeds 10000 chars', () => {
      const result = AnalyzeRequestSchema.safeParse({ transcript: 'x'.repeat(10001) })
      expect(result.success).toBe(false)
    })

    it('fails when views is negative', () => {
      const result = AnalyzeRequestSchema.safeParse({ caption: 'text', views: -1 })
      expect(result.success).toBe(false)
    })

    it('fails when views is not an integer', () => {
      const result = AnalyzeRequestSchema.safeParse({ caption: 'text', views: 1.5 })
      expect(result.success).toBe(false)
    })

    it('fails when likes is negative', () => {
      const result = AnalyzeRequestSchema.safeParse({ caption: 'text', likes: -10 })
      expect(result.success).toBe(false)
    })

    it('fails when comments is a string', () => {
      const result = AnalyzeRequestSchema.safeParse({ caption: 'text', comments: 'many' })
      expect(result.success).toBe(false)
    })

    it('fails on completely empty object', () => {
      const result = AnalyzeRequestSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('boundary values', () => {
    it('accepts caption exactly at 5000 chars', () => {
      const result = AnalyzeRequestSchema.safeParse({ caption: 'x'.repeat(5000) })
      expect(result.success).toBe(true)
    })

    it('accepts transcript exactly at 10000 chars', () => {
      const result = AnalyzeRequestSchema.safeParse({ transcript: 'x'.repeat(10000) })
      expect(result.success).toBe(true)
    })
  })
})
