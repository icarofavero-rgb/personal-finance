
import { useEffect, useState } from 'react'

type TypingTitleProps = {
  text: string
  speed?: number
}

function AnimatedTitle({
  text,
  speed,
}: {
  text: string
  speed: number
}) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (visibleCount >= text.length) return

    const timer = window.setTimeout(() => {
      setVisibleCount(count =>
        Math.min(count + 1, text.length)
      )
    }, speed)

    return () => window.clearTimeout(timer)
  }, [visibleCount, text, speed])

  return (
    <span className="pf-typing-title">
      <span aria-hidden="true">
        {text.slice(0, visibleCount)}
      </span>

      <span
        className="pf-typing-cursor"
        aria-hidden="true"
      >
        .
      </span>
    </span>
  )
}

export function TypingTitle({
  text,
  speed = 55,
}: TypingTitleProps) {
  return (
    <span aria-label={text}>
      <AnimatedTitle
        key={text}
        text={text}
        speed={Math.max(1, speed)}
      />
    </span>
  )
}
