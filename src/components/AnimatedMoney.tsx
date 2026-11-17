
import { useEffect, useRef, useState } from 'react'

type AnimatedMoneyProps = {
  value: number
  duration?: number
}

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function AnimatedMoney({
  value,
  duration = 750,
}: AnimatedMoneyProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const currentValue = useRef(value)

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )

   if (mediaQuery.matches || duration <= 0) {
  currentValue.current = value
  setDisplayValue(value)
  return
}

    let frame = 0
    let startTime: number | null = null

    const startValue = currentValue.current
    const difference = value - startValue

    if (difference === 0) return

    function animate(timestamp: number) {
      if (startTime === null) startTime = timestamp

      const progress = Math.min(
        (timestamp - startTime) / duration,
        1
      )

      const eased = 1 - Math.pow(1 - progress, 3)
      const nextValue = startValue + difference * eased

      currentValue.current = nextValue
      setDisplayValue(nextValue)

      if (progress < 1) {
        frame = requestAnimationFrame(animate)
      } else {
        currentValue.current = value
        setDisplayValue(value)
      }
    }

    frame = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <>{moneyFormatter.format(displayValue)}</>
}
