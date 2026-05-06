'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Animates a number from 0 to `target` over `duration` ms using
 * an ease-out-cubic easing. Returns the current animated value.
 */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const prevTarget = useRef<number>(0)

  useEffect(() => {
    if (target === prevTarget.current) return
    prevTarget.current = target

    const start = performance.now()
    const from = value

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      // ease-out-cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + ease * (target - from)))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return value
}
