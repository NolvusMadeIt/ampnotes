import { useId, type ChangeEvent } from 'react'

interface CategoryInputProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  label?: string
  className?: string
}

export function CategoryInput({
  value,
  onChange,
  suggestions,
  placeholder = 'Category',
  label = 'Category',
  className
}: CategoryInputProps) {
  const listId = useId()
  const visibleSuggestions = suggestions.slice(0, 8)

  return (
    <label className={`block text-sm ${className ?? ''}`}>
      {label ? <span className="mb-1 block font-medium">{label}</span> : null}
      <input
        className="h-10 w-full rounded-lg border border-line/20 bg-surface2 px-3 outline-none focus:border-accent/10"
        list={listId}
        value={value}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
      <datalist id={listId}>
        {suggestions.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      {visibleSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visibleSuggestions.map((item) => {
            const active = item.toLowerCase() === value.trim().toLowerCase()
            return (
              <button
                key={item}
                type="button"
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? 'border-accent/20 bg-accent/15 text-text'
                    : 'border-line/20 bg-surface text-muted hover:border-line/20 hover:text-text'
                }`}
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            )
          })}
        </div>
      )}
    </label>
  )
}
