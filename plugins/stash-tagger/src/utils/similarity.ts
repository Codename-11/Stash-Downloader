/**
 * String similarity utilities for matching entities
 */

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/**
 * Calculate similarity score between two strings (0-100)
 * Higher score = more similar
 */
export function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);

  if (normalizedA === normalizedB) return 100;
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);

  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * Normalize a string for comparison
 * - Lowercase
 * - Remove special characters
 * - Collapse whitespace
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')    // Collapse whitespace
    .trim();
}

/**
 * Check if a string matches any in a list of aliases
 * Returns the best match score
 */
export function matchWithAliases(
  local: string,
  remoteName: string,
  aliases: string[] = []
): number {
  // Check main name first
  let bestScore = stringSimilarity(local, remoteName);

  // Check aliases
  for (const alias of aliases) {
    const score = stringSimilarity(local, alias);
    if (score > bestScore) {
      bestScore = score;
    }
  }

  return bestScore;
}

/**
 * Calculate confidence level based on score
 */
export function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 95) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}

/**
 * Check if two names are likely the same entity
 * Uses multiple heuristics
 */
export function isLikelyMatch(local: string, remote: string, aliases: string[] = []): boolean {
  const score = matchWithAliases(local, remote, aliases);
  return score >= 70;
}

/**
 * Sort candidates by similarity score (descending)
 */
export function sortByScore<T extends { score: number }>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => b.score - a.score);
}
