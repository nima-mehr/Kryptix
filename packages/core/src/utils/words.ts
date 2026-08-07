/** Count words in a recovery phrase (whitespace-separated). */
export function countWords(phrase: string): number {
  return phrase
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}
