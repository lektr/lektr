/**
 * Deterministically generate a pastel gradient from a string seed (e.g. book title)
 */
export function getBookGradient(seed: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Define curated pastel color pairs (from/to)
  // Dark mode uses higher opacity (70%) for better contrast with light text
  const gradients = [
    "from-rose-200 to-orange-100 dark:from-rose-900/70 dark:to-orange-900/70",
    "from-violet-200 to-fuchsia-100 dark:from-violet-900/70 dark:to-fuchsia-900/70",
    "from-cyan-200 to-blue-100 dark:from-cyan-900/70 dark:to-blue-900/70",
    "from-emerald-200 to-teal-100 dark:from-emerald-900/70 dark:to-teal-900/70",
    "from-amber-200 to-yellow-100 dark:from-amber-900/70 dark:to-yellow-900/70",
    "from-indigo-200 to-purple-100 dark:from-indigo-900/70 dark:to-purple-900/70",
    "from-pink-200 to-rose-100 dark:from-pink-900/70 dark:to-rose-900/70",
    "from-sky-200 to-indigo-100 dark:from-sky-900/70 dark:to-indigo-900/70",
  ];

  // Pick a gradient based on hash
  const index = Math.abs(hash) % gradients.length;
  return `bg-gradient-to-br ${gradients[index]}`;
}

/**
 * Get a consistent border color for the placeholder
 */
export function getBookBorderColor(seed: string): string {
  const colors = [
    "border-rose-200 dark:border-rose-800",
    "border-violet-200 dark:border-violet-800",
    "border-cyan-200 dark:border-cyan-800",
    "border-emerald-200 dark:border-emerald-800",
    "border-amber-200 dark:border-amber-800",
    "border-indigo-200 dark:border-indigo-800",
  ];
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
