/**
 * Generates avatar initials according to TaskDesk naming conventions:
 * - If a user has only one name part, returns only the first character (e.g. 'Anchal' -> 'A').
 * - If a user has a first and last name, returns 2 initials (e.g. 'Vivek Kumar' -> 'VK', 'Jyoti Singh' -> 'JS').
 * - Handles missing names, null/undefined, and extra whitespace safely with fallback 'U'.
 */
export function getAvatarInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
