import type { PasswordEntry } from '../types/vault';

/**
 * When the user reorders a filtered subset, put those items back into the
 * full vault while keeping non-filtered items in place.
 */
export function applyFilteredReorder(
  full: PasswordEntry[],
  reorderedFiltered: PasswordEntry[]
): PasswordEntry[] {
  if (reorderedFiltered.length === 0) return full;

  const filteredIds = new Set(reorderedFiltered.map((e) => e.id));
  let i = 0;
  return full.map((entry) => {
    if (filteredIds.has(entry.id)) {
      return reorderedFiltered[i++];
    }
    return entry;
  });
}
