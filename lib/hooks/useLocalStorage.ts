'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { z } from 'zod'

export function useLocalStorage<T>(
  key: string,
  schema: z.ZodSchema<T>,
  fallback: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Stabilise fallback so callers can safely pass inline literals without
  // triggering effect/callback re-runs on every render (PERF-5).
  const fallbackRef = useRef<T>(fallback)

  const [storedValue, setStoredValue] = useState<T>(fallback)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return
      const parsed = schema.safeParse(JSON.parse(raw))
      if (parsed.success) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStoredValue(parsed.data)
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(`[useLocalStorage] Validation failed for key "${key}":`, parsed.error)
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[useLocalStorage] Failed to read key "${key}":`, e)
      }
    }
  }, [key, schema])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== key) return
      if (e.newValue === null) {
        setStoredValue(fallbackRef.current)
        return
      }
      try {
        const parsed = schema.safeParse(JSON.parse(e.newValue))
        if (parsed.success) {
          setStoredValue(parsed.data)
        } else if (process.env.NODE_ENV === 'development') {
          console.warn(`[useLocalStorage] Cross-tab validation failed for key "${key}":`, parsed.error)
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[useLocalStorage] Cross-tab read failed for key "${key}":`, e)
        }
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [key, schema])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[useLocalStorage] Failed to write key "${key}":`, e)
          }
        }
        return next
      })
    },
    [key],
  )

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[useLocalStorage] Failed to remove key "${key}":`, e)
      }
    }
    setStoredValue(fallbackRef.current)
  }, [key])

  return [storedValue, setValue, remove]
}
