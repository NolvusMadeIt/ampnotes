import { useMemo, useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface TagsInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  label?: string
  placeholder?: string
}

function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#/, '')
}

export function TagsInput({
  tags,
  onChange,
  suggestions,
  label = 'Tags',
  placeholder = 'Add tag and press Enter'
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('')

  const availableSuggestions = useMemo(() => {
    const used = new Set(tags.map((tag) => tag.toLowerCase()))
    return suggestions.filter((item) => !used.has(item.toLowerCase())).slice(0, 8)
  }, [suggestions, tags])

  const addTag = (raw: string) => {
    const next = normalizeTag(raw)
    if (!next) {
      return
    }

    if (tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setInputValue('')
      return
    }

    onChange([...tags, next])
    setInputValue('')
  }

  const removeTag = (target: string) => {
    onChange(tags.filter((tag) => tag.toLowerCase() !== target.toLowerCase()))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(inputValue)
      return
    }

    if (event.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <div className="rounded-lg border border-line/20 bg-surface2 px-2 py-2">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md border border-accent/10 bg-accent/12 px-2.5 py-1 text-xs font-medium text-text"
            >
              #{tag}
              <button
                type="button"
                className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted hover:bg-accent/18 hover:text-text"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <input
            className="h-7 min-w-[140px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted"
            placeholder={placeholder}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => addTag(inputValue)}
          />
        </div>
      </div>
      {availableSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {availableSuggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-md border border-line/20 bg-surface px-2.5 py-1 text-xs text-muted transition-colors hover:border-line/20 hover:text-text"
              onClick={() => addTag(item)}
            >
              + #{item}
            </button>
          ))}
        </div>
      )}
    </label>
  )
}
