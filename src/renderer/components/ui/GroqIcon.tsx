interface GroqIconProps {
  size?: number
  className?: string
}

export function GroqIcon({ size = 14, className = '' }: GroqIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[4px] bg-text text-surface ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.6)), fontWeight: 700, lineHeight: 1 }}
      aria-hidden
    >
      G
    </span>
  )
}
