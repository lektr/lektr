/**
 * Title Normalization Utilities
 * Cleans up book titles for better metadata matching
 */

/**
 * Normalize a book title for search matching
 * - Removes subtitles (after : or -)
 * - Removes series info in parentheses like "(Series Name #1)"
 * - Removes edition info like "[Kindle Edition]"
 * - Normalizes whitespace and casing
 */
export function normalizeTitle(title: string): string {
  let normalized = title;

  // Remove content in square brackets (e.g., [Kindle Edition])
  normalized = normalized.replace(/\[.*?\]/g, "");

  // Remove series info in parentheses (e.g., "(The Hunger Games #1)")
  // Be careful to keep important parenthetical info
  normalized = normalized.replace(/\s*\([^)]*#\d+[^)]*\)\s*/g, "");
  normalized = normalized.replace(/\s*\(.*?(?:Series|Book|Vol|Volume|Part)\s*\d*.*?\)\s*/gi, "");

  // Remove subtitles (after : or long dash) - but keep short ones
  const colonIndex = normalized.indexOf(":");
  if (colonIndex > 0 && colonIndex < normalized.length - 1) {
    const mainTitle = normalized.substring(0, colonIndex).trim();
    // Only remove subtitle if main title is substantial (> 3 words or > 15 chars)
    if (mainTitle.split(/\s+/).length >= 3 || mainTitle.length > 15) {
      normalized = mainTitle;
    }
  }

  // Also check for em-dash or long dash subtitles
  const dashPatterns = [" - ", " – ", " — "];
  for (const dash of dashPatterns) {
    const dashIndex = normalized.indexOf(dash);
    if (dashIndex > 0) {
      const mainTitle = normalized.substring(0, dashIndex).trim();
      if (mainTitle.split(/\s+/).length >= 2 || mainTitle.length > 10) {
        normalized = mainTitle;
        break;
      }
    }
  }

  // Remove common edition/format suffixes
  normalized = normalized.replace(/\s*(?:Kindle|Paperback|Hardcover|eBook|Audiobook)\s*(?:Edition)?$/gi, "");

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Remove leading/trailing punctuation
  normalized = normalized.replace(/^[^\w]+|[^\w]+$/g, "");

  return normalized;
}

/**
 * Normalize an author name for matching
 * - Removes titles (Dr., Mr., etc.)
 * - Normalizes whitespace
 */
export function normalizeAuthor(author: string): string {
  let normalized = author;

  // Remove common titles
  normalized = normalized.replace(/^(?:Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Prof\.?|Sir|Dame)\s+/gi, "");

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Generate search variations of a title
 * Returns an array of titles to try, from most specific to least
 */
export function getTitleVariations(title: string): string[] {
  const variations: string[] = [];
  
  // Original title
  variations.push(title);
  
  // Normalized version
  const normalized = normalizeTitle(title);
  if (normalized !== title && normalized.length > 0) {
    variations.push(normalized);
  }
  
  // Remove "The " prefix if present
  if (normalized.toLowerCase().startsWith("the ")) {
    variations.push(normalized.substring(4));
  }
  
  // Remove "A " prefix if present
  if (normalized.toLowerCase().startsWith("a ")) {
    variations.push(normalized.substring(2));
  }

  return [...new Set(variations)]; // Remove duplicates
}