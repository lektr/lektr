/**
 * Decode HTML entities in text content
 * Handles common HTML entities like &ldquo; &rdquo; &amp; etc.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  
  // Common HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&apos;': "'",
    '&ldquo;': '\u201C', // "
    '&rdquo;': '\u201D', // "
    '&lsquo;': '\u2018', // '
    '&rsquo;': '\u2019', // '
    '&mdash;': '\u2014', // —
    '&ndash;': '\u2013', // –
    '&hellip;': '\u2026', // …
    '&trade;': '\u2122', // ™
    '&copy;': '\u00A9', // ©
    '&reg;': '\u00AE', // ®
    '&deg;': '\u00B0', // °
    '&plusmn;': '\u00B1', // ±
    '&frac12;': '\u00BD', // ½
    '&frac14;': '\u00BC', // ¼
    '&frac34;': '\u00BE', // ¾
    '&times;': '\u00D7', // ×
    '&divide;': '\u00F7', // ÷
    '&euro;': '\u20AC', // €
    '&pound;': '\u00A3', // £
    '&yen;': '\u00A5', // ¥
    '&cent;': '\u00A2', // ¢
  };

  let result = text;

  // Replace named entities
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }

  // Replace numeric entities (&#123; or &#x7B;)
  result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return result;
}
