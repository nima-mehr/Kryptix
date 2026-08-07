/** Simple unique id (no external deps). Good enough for vault entries. */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}
