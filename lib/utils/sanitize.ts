/**
 * Sanitize user input for use in Supabase PostgREST filter strings.
 * Escapes characters that have special meaning in PostgREST/PostgreSQL LIKE patterns.
 */
export function sanitizeSearchInput(input: string): string {
  // Remove any characters that could break the PostgREST filter syntax
  // PostgREST uses commas to separate conditions and dots for operators
  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')     // Escape LIKE wildcard
    .replace(/_/g, '\\_')     // Escape LIKE single char wildcard
    .replace(/,/g, '')        // Remove commas (PostgREST condition separator)
    .replace(/\./g, '')       // Remove dots (PostgREST operator separator)
    .replace(/\(/g, '')       // Remove parens
    .replace(/\)/g, '')       // Remove parens
    .trim()
    .slice(0, 200);           // Limit length
}
