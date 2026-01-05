/**
 * String utility functions
 */

/**
 * Check if a value is a non-empty string (after trimming whitespace)
 */
export function isNonEmptyString(value: unknown): value is string {
  return Boolean(value && typeof value === 'string' && value.trim());
}

/**
 * Check if a string value is empty or only whitespace
 */
export function isEmptyString(value: string | null | undefined): boolean {
  return !value?.trim();
}
