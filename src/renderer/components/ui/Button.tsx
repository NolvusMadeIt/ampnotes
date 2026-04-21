import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accentContrast border border-transparent hover:bg-accent/92 hover:border-transparent',
  secondary: 'bg-surface2 text-text border border-line/20 hover:bg-surface hover:border-line/20',
  ghost: 'bg-transparent text-text border border-transparent hover:bg-surface2',
  danger: 'bg-danger/14 text-danger border border-danger/20 hover:bg-danger/24 hover:border-danger/30'
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-[var(--control-height-sm)] px-[var(--control-padding-x)] text-sm',
  md: 'h-[var(--control-height-md)] px-[calc(var(--control-padding-x)*1.15)] text-sm'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex w-auto max-w-full items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
