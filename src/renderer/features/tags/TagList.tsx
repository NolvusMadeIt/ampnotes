import { Hash } from 'lucide-react'

interface TagListProps {
  tags: Array<{ name: string; count: number }>
  activeTag: string | null
  onSelectTag: (tag: string | null) => void
}

export function TagList({ tags, activeTag, onSelectTag }: TagListProps) {
  return (
    <div className="space-y-1">
      <button
        className={`w-full rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors ${
          activeTag === null
            ? 'border-accent/10 bg-accent/10 text-text'
            : 'border-line/20 text-muted hover:border-line/20 hover:bg-surface2'
        }`}
        onClick={() => onSelectTag(null)}
      >
        All tags
      </button>
      {tags.map((tag) => (
        <button
          key={tag.name}
          className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors ${
            activeTag === tag.name
              ? 'border-accent/10 bg-accent/10 text-text'
              : 'border-line/20 text-muted hover:border-line/20 hover:bg-surface2'
          }`}
          onClick={() => onSelectTag(tag.name)}
        >
          <span className="inline-flex items-center gap-1">
            <Hash size={12} />
            {tag.name}
          </span>
          <span className="mono-meta text-xs">{tag.count}</span>
        </button>
      ))}
    </div>
  )
}
