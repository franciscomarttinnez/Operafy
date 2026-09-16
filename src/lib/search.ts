export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase()
}

export function matchesSearchQuery(
  query: string,
  ...fields: Array<string | null | undefined>
): boolean {
  const normalized = normalizeSearch(query)
  if (!normalized) {
    return true
  }

  return fields.some((field) => field?.toLowerCase().includes(normalized))
}
