import { GenerateRequestSchema } from '@/lib/schemas/copy/generate'

describe('GenerateRequestSchema', () => {
  const BASE_VALID = {
    type: 'reels-virales',
    cantidad: 5,
  }

  describe('happy path', () => {
    it('accepts minimal valid payload', () => {
      const result = GenerateRequestSchema.safeParse(BASE_VALID)
      expect(result.success).toBe(true)
    })

    it('accepts all valid type values', () => {
      const types = ['reels-virales', 'reels-nicho', 'anuncios', 'ideas']
      for (const type of types) {
        const result = GenerateRequestSchema.safeParse({ ...BASE_VALID, type })
        expect(result.success).toBe(true)
      }
    })

    it('accepts all optional fields', () => {
      const result = GenerateRequestSchema.safeParse({
        type: 'anuncios',
        categoria: 'educacional',
        tono: 'Directo',
        cantidad: 10,
        icpContext: 'Nombre: Ana\nRol: Coach',
      })
      expect(result.success).toBe(true)
    })

    it('accepts cantidad at minimum boundary (1)', () => {
      const result = GenerateRequestSchema.safeParse({ ...BASE_VALID, cantidad: 1 })
      expect(result.success).toBe(true)
    })

    it('accepts cantidad at maximum boundary (20)', () => {
      const result = GenerateRequestSchema.safeParse({ ...BASE_VALID, cantidad: 20 })
      expect(result.success).toBe(true)
    })
  })

  describe('failure cases — missing required', () => {
    it('fails when type is missing', () => {
      const result = GenerateRequestSchema.safeParse({ cantidad: 5 })
      expect(result.success).toBe(false)
    })

    it('fails when cantidad is missing', () => {
      const result = GenerateRequestSchema.safeParse({ type: 'reels-virales' })
      expect(result.success).toBe(false)
    })

    it('fails on empty object', () => {
      const result = GenerateRequestSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('failure cases — wrong type', () => {
    it('fails when type is not a valid enum value', () => {
      const result = GenerateRequestSchema.safeParse({ ...BASE_VALID, type: 'unknown-type' })
      expect(result.success).toBe(false)
    })

    it('fails when cantidad is a string', () => {
      const result = GenerateRequestSchema.safeParse({ type: 'reels-virales', cantidad: 'five' })
      expect(result.success).toBe(false)
    })

    it('fails when tipo is null', () => {
      const result = GenerateRequestSchema.safeParse({ type: null, cantidad: 5 })
      expect(result.success).toBe(false)
    })
  })

  describe('failure cases — out of range', () => {
    it('fails when cantidad is 0', () => {
      const result = GenerateRequestSchema.safeParse({ ...BASE_VALID, cantidad: 0 })
      expect(result.success).toBe(false)
    })

    it('fails when cantidad exceeds 20', () => {
      const result = GenerateRequestSchema.safeParse({ ...BASE_VALID, cantidad: 21 })
      expect(result.success).toBe(false)
    })

    it('fails when cantidad is a float', () => {
      const result = GenerateRequestSchema.safeParse({ ...BASE_VALID, cantidad: 3.5 })
      expect(result.success).toBe(false)
    })

    it('fails when categoria exceeds 200 chars', () => {
      const result = GenerateRequestSchema.safeParse({ ...BASE_VALID, categoria: 'x'.repeat(201) })
      expect(result.success).toBe(false)
    })

    it('fails when tono exceeds 100 chars', () => {
      const result = GenerateRequestSchema.safeParse({ ...BASE_VALID, tono: 'x'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('fails when icpContext exceeds 2000 chars', () => {
      const result = GenerateRequestSchema.safeParse({ ...BASE_VALID, icpContext: 'x'.repeat(2001) })
      expect(result.success).toBe(false)
    })
  })
})
