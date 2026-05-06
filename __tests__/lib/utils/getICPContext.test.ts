import { getICPContext, getICPSummary } from '@/lib/utils/getICPContext'

function mockFetchICP(data: object | null) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  }) as jest.Mock
}

function mockFetchError() {
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.Mock
}

describe('getICPContext', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns null when API returns null', async () => {
    mockFetchICP(null)
    expect(await getICPContext()).toBeNull()
  })

  it('returns null when ICP has no meaningful data', async () => {
    mockFetchICP({
      nombre: '', rol: '', edad: '', ingresos: '', nicho: '',
      dolores: '[]', deseos: '[]', creencias: '[]', updatedAt: '',
    })
    expect(await getICPContext()).toBeNull()
  })

  it('returns string with profile lines when data is filled', async () => {
    mockFetchICP({
      nombre: 'Ana', rol: 'Coach', edad: '35', ingresos: '5k', nicho: 'fitness',
      dolores: JSON.stringify(['falta tiempo']),
      deseos:  JSON.stringify(['escalar']),
      creencias: JSON.stringify(['caro']),
      updatedAt: '',
    })
    const result = await getICPContext()
    expect(result).not.toBeNull()
    expect(result).toContain('Ana')
    expect(result).toContain('Coach')
    expect(result).toContain('falta tiempo')
    expect(result).toContain('escalar')
  })

  it('returns null on fetch error', async () => {
    mockFetchError()
    expect(await getICPContext()).toBeNull()
  })

  it('includes only filled fields in output', async () => {
    mockFetchICP({
      nombre: 'Juan', rol: '', edad: '', ingresos: '', nicho: '',
      dolores: '[]', deseos: JSON.stringify(['crecer']), creencias: '[]', updatedAt: '',
    })
    const result = await getICPContext()
    expect(result).toContain('Juan')
    expect(result).toContain('crecer')
    expect(result).not.toContain('Rol')
  })
})

describe('getICPSummary', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns filled=false with zero counts when API returns null', async () => {
    mockFetchICP(null)
    const summary = await getICPSummary()
    expect(summary.filled).toBe(false)
    expect(summary.doloresCount).toBe(0)
    expect(summary.deseosCount).toBe(0)
  })

  it('returns filled=true when nombre is set', async () => {
    mockFetchICP({
      nombre: 'Maria', rol: '', edad: '', ingresos: '', nicho: '',
      dolores: '[]', deseos: '[]', creencias: '[]', updatedAt: '',
    })
    const summary = await getICPSummary()
    expect(summary.filled).toBe(true)
    expect(summary.nombre).toBe('Maria')
  })

  it('counts dolores and deseos correctly', async () => {
    mockFetchICP({
      nombre: '', rol: '', edad: '', ingresos: '', nicho: '',
      dolores: JSON.stringify(['a', 'b', 'c']),
      deseos:  JSON.stringify(['x', 'y']),
      creencias: '[]', updatedAt: '',
    })
    const summary = await getICPSummary()
    expect(summary.doloresCount).toBe(3)
    expect(summary.deseosCount).toBe(2)
    expect(summary.filled).toBe(true)
  })

  it('returns filled=false on fetch error', async () => {
    mockFetchError()
    const summary = await getICPSummary()
    expect(summary.filled).toBe(false)
  })
})
