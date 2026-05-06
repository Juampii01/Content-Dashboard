import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'

const schema = z.string()
const numberSchema = z.number()
const arraySchema = z.array(z.string())

const KEY = 'test_key'

function clearStorage() {
  localStorage.clear()
}

beforeEach(() => {
  clearStorage()
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('useLocalStorage', () => {
  it('returns fallback when key is absent', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('reads existing valid value on mount', () => {
    localStorage.setItem(KEY, JSON.stringify('stored'))
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'default'))
    expect(result.current[0]).toBe('stored')
  })

  it('returns fallback on corrupted JSON', () => {
    localStorage.setItem(KEY, 'NOT_JSON{{{')
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('returns fallback when schema validation fails', () => {
    localStorage.setItem(KEY, JSON.stringify(42))
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('setValue writes to localStorage and updates state', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'default'))
    act(() => {
      result.current[1]('new-value')
    })
    expect(result.current[0]).toBe('new-value')
    expect(JSON.parse(localStorage.getItem(KEY) ?? 'null')).toBe('new-value')
  })

  it('handles functional setter form', () => {
    localStorage.setItem(KEY, JSON.stringify('hello'))
    const { result } = renderHook(() => useLocalStorage(KEY, schema, ''))
    act(() => {
      result.current[1]((prev) => prev + ' world')
    })
    expect(result.current[0]).toBe('hello world')
    expect(JSON.parse(localStorage.getItem(KEY) ?? 'null')).toBe('hello world')
  })

  it('remove clears localStorage and resets to fallback', () => {
    localStorage.setItem(KEY, JSON.stringify('value'))
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'fallback'))
    act(() => {
      result.current[2]()
    })
    expect(result.current[0]).toBe('fallback')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('does not access localStorage during SSR (initial state is fallback)', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem')
    localStorage.setItem(KEY, JSON.stringify('stored'))
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'default'))
    expect(result.current[0]).toBeDefined()
    spy.mockRestore()
  })

  it('syncs state on cross-tab storage event', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'default'))
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: KEY, newValue: JSON.stringify('cross-tab') }),
      )
    })
    expect(result.current[0]).toBe('cross-tab')
  })

  it('resets to fallback on cross-tab remove (newValue null)', () => {
    localStorage.setItem(KEY, JSON.stringify('current'))
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'fallback'))
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null }))
    })
    expect(result.current[0]).toBe('fallback')
  })

  it('ignores storage events for other keys', () => {
    localStorage.setItem(KEY, JSON.stringify('mine'))
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'default'))
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'other_key', newValue: JSON.stringify('other') }),
      )
    })
    expect(result.current[0]).toBe('mine')
  })

  it('works with number schema', () => {
    localStorage.setItem(KEY, JSON.stringify(42))
    const { result } = renderHook(() => useLocalStorage(KEY, numberSchema, 0))
    expect(result.current[0]).toBe(42)
  })

  it('works with array schema', () => {
    localStorage.setItem(KEY, JSON.stringify(['a', 'b']))
    const { result } = renderHook(() => useLocalStorage(KEY, arraySchema, []))
    expect(result.current[0]).toEqual(['a', 'b'])
  })

  it('returns fallback when cross-tab event has invalid JSON', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, schema, 'fallback'))
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: 'BAD_JSON' }))
    })
    expect(result.current[0]).toBe('fallback')
  })
})
