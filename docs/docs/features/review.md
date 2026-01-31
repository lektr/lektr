---
sidebar_position: 3
---

# Spaced Repetition Review

Lektr includes a built-in spaced repetition system (SRS) powered by the FSRS algorithm to help you remember your highlights long-term.

## What is Spaced Repetition?

Spaced repetition is a learning technique that shows you information at increasing intervals. It's based on the "forgetting curve" - the idea that we forget things at a predictable rate, and reviewing just before we forget is most effective.

## The FSRS Algorithm

Lektr uses **FSRS (Free Spaced Repetition Scheduler)**, a modern algorithm that:
- Learns your individual memory patterns
- Predicts optimal review times
- Adjusts based on your performance

## Using Review Mode

1. Navigate to **Review**
2. A highlight card is displayed
3. Try to recall where it's from and what it means
4. Click to reveal the full context
5. Rate your recall:

| Rating | Meaning | Effect |
|--------|---------|--------|
| **Again** | Didn't remember | Shorter interval |
| **Hard** | Struggled to recall | Slightly shorter |
| **Good** | Remembered well | Standard interval |
| **Easy** | Instant recall | Longer interval |

## Progress Tracking

The review page shows:
- **Due today**: Highlights ready for review
- **New**: Highlights never reviewed
- **Learning**: Recently introduced highlights
- **Review**: Established highlights

## Daily Digest

If you have email configured, Lektr sends daily digest emails with your highlights due for review. See [Email Setup](/admin/email-setup) for configuration.

## Best Practices

1. **Review daily** - Consistent short sessions beat occasional long ones
2. **Be honest** - Rate your actual recall, not what you wish it was
3. **Keep sessions short** - 10-15 minutes is often enough
4. **Trust the algorithm** - FSRS adapts to your memory

## Resetting Progress

To reset a highlight's review history:

1. Go to the book in your Library
2. Find the highlight
3. Use the menu to reset spaced repetition data

:::warning
Resetting clears all learning data for that highlight.
:::
