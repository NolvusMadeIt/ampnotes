interface SearchInputProps {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <input
      className="h-10 w-full rounded-lg border border-line/20 bg-surface px-3 text-sm outline-none focus:border-accent/10"
      placeholder="Search prompts, content, tags"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
