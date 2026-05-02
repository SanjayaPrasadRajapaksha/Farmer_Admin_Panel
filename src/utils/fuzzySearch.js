/**
 * Fuzzy search utility for admin panel search functionality.
 * Implements a scoring-based fuzzy match algorithm to find partial text matches.
 */

/**
 * Calculate a fuzzy match score between a search query and a target string.
 * Scoring prioritizes: exact matches > consecutive character matches > scattered matches.
 * Returns 0 if no match, higher numbers = better match.
 * 
 * @param {string} query - The search query (e.g., "tom")
 * @param {string} target - The string to search in (e.g., "Thomas")
 * @returns {number} Score between 0 (no match) and 1+ (perfect match)
 */
export function calculateFuzzyScore(query, target) {
  if (!query || !target) return 0;

  const q = String(query).toLowerCase().trim();
  const t = String(target).toLowerCase().trim();

  // Exact match gets highest score
  if (t === q) return 100;

  // Substring match gets high score
  if (t.includes(q)) return 50 + q.length / t.length;

  // Character-by-character fuzzy match
  let queryIdx = 0;
  let targetIdx = 0;
  let score = 0;
  let consecutiveMatches = 0;

  while (queryIdx < q.length && targetIdx < t.length) {
    if (q[queryIdx] === t[targetIdx]) {
      queryIdx++;
      consecutiveMatches++;
      score += 1 + consecutiveMatches * 0.5; // Bonus for consecutive matches
    } else {
      consecutiveMatches = 0;
      score = Math.max(0, score - 0.5); // Penalty for gaps
    }
    targetIdx++;
  }

  // All query chars must be found
  if (queryIdx < q.length) return 0;

  return Math.max(0, score);
}

/**
 * Filter and sort an array of objects using fuzzy search across specified fields.
 * 
 * @param {Array} items - Array of objects to search
 * @param {string} query - Search query
 * @param {Array<string>} searchFields - Object properties to search in (e.g., ['name', 'email'])
 * @returns {Array} Filtered and sorted items, highest scores first
 */
export function fuzzyFilterAndSort(items, query, searchFields) {
  if (!query || !query.trim()) return items;

  const q = query.trim();
  const scored = items
    .map((item) => {
      let maxScore = 0;

      // Calculate best score across all search fields
      for (const field of searchFields) {
        const fieldValue = String(item?.[field] ?? "");
        const score = calculateFuzzyScore(q, fieldValue);
        maxScore = Math.max(maxScore, score);
      }

      return { item, score: maxScore };
    })
    .filter(({ score }) => score > 0) // Only keep items with a match
    .sort((a, b) => b.score - a.score); // Sort by score descending

  return scored.map(({ item }) => item);
}

/**
 * Simple substring search (case-insensitive) across multiple fields.
 * Faster than fuzzy search but less intelligent.
 * 
 * @param {Array} items - Array of objects to search
 * @param {string} query - Search query
 * @param {Array<string>} searchFields - Object properties to search in
 * @returns {Array} Filtered items
 */
export function substringFilterSearch(items, query, searchFields) {
  if (!query || !query.trim()) return items;

  const q = String(query).toLowerCase().trim();

  return items.filter((item) => {
    return searchFields.some((field) => {
      const fieldValue = String(item?.[field] ?? "").toLowerCase();
      return fieldValue.includes(q);
    });
  });
}

export default {
  calculateFuzzyScore,
  fuzzyFilterAndSort,
  substringFilterSearch,
};
