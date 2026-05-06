import { renderHook, act } from '@testing-library/react'
import { useTab } from '@/hooks/useTab'

const mockReplace = jest.fn()
const mockGet = jest.fn()

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
    toString: () => '',
  }),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/instagram',
}))

describe('useTab', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    mockGet.mockClear()
  })

  it('returns default tab "dashboard" when no query param is present', () => {
    mockGet.mockReturnValue(null)
    const { result } = renderHook(() => useTab())
    expect(result.current[0]).toBe('dashboard')
  })

  it('returns "reels" when tab=reels is in the URL', () => {
    mockGet.mockReturnValue('reels')
    const { result } = renderHook(() => useTab())
    expect(result.current[0]).toBe('reels')
  })

  it('returns "historias" when tab=historias is in the URL', () => {
    mockGet.mockReturnValue('historias')
    const { result } = renderHook(() => useTab())
    expect(result.current[0]).toBe('historias')
  })

  it('returns "publicaciones" when tab=publicaciones is in the URL', () => {
    mockGet.mockReturnValue('publicaciones')
    const { result } = renderHook(() => useTab())
    expect(result.current[0]).toBe('publicaciones')
  })

  it('returns "competencia" when tab=competencia is in the URL', () => {
    mockGet.mockReturnValue('competencia')
    const { result } = renderHook(() => useTab())
    expect(result.current[0]).toBe('competencia')
  })

  it('returns "referencias" when tab=referencias is in the URL', () => {
    mockGet.mockReturnValue('referencias')
    const { result } = renderHook(() => useTab())
    expect(result.current[0]).toBe('referencias')
  })

  it('returns "demografia" when tab=demografia is in the URL', () => {
    mockGet.mockReturnValue('demografia')
    const { result } = renderHook(() => useTab())
    expect(result.current[0]).toBe('demografia')
  })

  it('returns default "dashboard" for an unrecognized tab value', () => {
    mockGet.mockReturnValue('unknown-tab')
    const { result } = renderHook(() => useTab())
    expect(result.current[0]).toBe('dashboard')
  })

  it('calls router.replace with new tab param when setTab is called', () => {
    mockGet.mockReturnValue(null)
    const { result } = renderHook(() => useTab())
    act(() => {
      result.current[1]('reels')
    })
    expect(mockReplace).toHaveBeenCalledWith('/instagram?tab=reels', { scroll: false })
  })

  it('setTab updates to any valid tab', () => {
    mockGet.mockReturnValue('dashboard')
    const { result } = renderHook(() => useTab())
    act(() => {
      result.current[1]('competencia')
    })
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('tab=competencia'),
      { scroll: false },
    )
  })
})
