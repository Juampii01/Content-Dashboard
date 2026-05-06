import { renderHook, act } from '@testing-library/react'
import { usePeriod } from '@/hooks/usePeriod'

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

describe('usePeriod', () => {
  beforeEach(() => {
    mockReplace.mockClear()
    mockGet.mockClear()
  })

  it('returns default period 30 when no query param is present', () => {
    mockGet.mockReturnValue(null)
    const { result } = renderHook(() => usePeriod())
    expect(result.current[0]).toBe(30)
  })

  it('returns 7 when period=7 is in the URL', () => {
    mockGet.mockReturnValue('7')
    const { result } = renderHook(() => usePeriod())
    expect(result.current[0]).toBe(7)
  })

  it('returns 14 when period=14 is in the URL', () => {
    mockGet.mockReturnValue('14')
    const { result } = renderHook(() => usePeriod())
    expect(result.current[0]).toBe(14)
  })

  it('returns 90 when period=90 is in the URL', () => {
    mockGet.mockReturnValue('90')
    const { result } = renderHook(() => usePeriod())
    expect(result.current[0]).toBe(90)
  })

  it('returns default 30 for an invalid period value', () => {
    mockGet.mockReturnValue('999')
    const { result } = renderHook(() => usePeriod())
    expect(result.current[0]).toBe(30)
  })

  it('returns default 30 for non-numeric period value', () => {
    mockGet.mockReturnValue('abc')
    const { result } = renderHook(() => usePeriod())
    expect(result.current[0]).toBe(30)
  })

  it('calls router.replace with the new period when setPeriod is called', () => {
    mockGet.mockReturnValue(null)
    const { result } = renderHook(() => usePeriod())
    act(() => {
      result.current[1](14)
    })
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('period=14'),
      { scroll: false },
    )
  })

  it('setPeriod navigates to pathname with updated param', () => {
    mockGet.mockReturnValue('30')
    const { result } = renderHook(() => usePeriod())
    act(() => {
      result.current[1](90)
    })
    expect(mockReplace).toHaveBeenCalledWith('/instagram?period=90', { scroll: false })
  })
})
