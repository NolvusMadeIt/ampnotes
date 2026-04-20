import type { ListingFilters } from '@/lib/types'

interface CatalogFiltersProps {
  value: ListingFilters
}

export function CatalogFilters({ value }: CatalogFiltersProps) {
  return (
    <form className="filters" method="get" action="/">
      <label>
        Search
        <input name="q" defaultValue={value.q ?? ''} placeholder="Search plugins, themes, tags..." />
      </label>

      <label>
        Type
        <select name="kind" defaultValue={value.kind ?? 'all'}>
          <option value="all">All</option>
          <option value="plugin">Plugins</option>
          <option value="theme">Themes</option>
        </select>
      </label>

      <label>
        Price
        <select name="tier" defaultValue={value.tier ?? 'all'}>
          <option value="all">All</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </label>

      <label>
        Sort
        <select name="sort" defaultValue={value.sort ?? 'featured'}>
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="top">Top rated</option>
        </select>
      </label>

      <button type="submit" className="button button-secondary">
        Apply
      </button>
    </form>
  )
}
