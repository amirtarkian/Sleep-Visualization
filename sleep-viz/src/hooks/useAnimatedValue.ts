import { useState, useEffect, useRef } from 'react'

export function useAnimatedValue(target: number, duration: number = 1200): number {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = value

    let startTime = 0
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(fromRef.current + (target - fromRef.current) * eased)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}
