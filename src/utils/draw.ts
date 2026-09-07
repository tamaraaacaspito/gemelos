/**
 * Fisher-Yates shuffle algorithm.
 * Returns a new shuffled copy of the array.
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate random pairs from a list of participant IDs.
 * Requires an even number of participants.
 * Returns array of [id1, id2] tuples.
 *
 * NOTE: The actual draw is executed server-side in a PostgreSQL RPC function.
 * This utility is provided for reference and testing only.
 */
export function generatePairs(ids: string[]): [string, string][] {
  if (ids.length % 2 !== 0) {
    throw new Error('Se necesita un número par de participantes');
  }

  const shuffled = shuffle(ids);
  const pairs: [string, string][] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }

  return pairs;
}
