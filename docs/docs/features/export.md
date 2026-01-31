---
sidebar_position: 4
---

# Export

Export your highlights to various formats and services.

## Supported Exports

| Format | Type | Use Case |
|--------|------|----------|
| **Markdown** | File | General use, backup |
| **Obsidian** | File | Obsidian vault integration |
| **Notion** | API | Direct Notion database sync |
| **Readwise** | API | Readwise library sync |

## Markdown Export

Exports highlights as clean Markdown files.

### Options

- **Include notes**: Add your annotations
- **Include tags**: Add tag metadata
- **Group by book**: One file per book or all combined

### Example Output

```markdown
# Atomic Habits
*James Clear*

---

> The most effective way to change your habits is to focus not on what you want to achieve, but on who you wish to become.

Note: Identity-based habits

---

> Every action you take is a vote for the type of person you wish to become.

Tags: #habits #identity
```

## Obsidian Export

Optimized for Obsidian with:
- YAML frontmatter
- Wiki-style links
- Tag formatting

### Output

```markdown
---
title: Atomic Habits
author: James Clear
tags: [books, habits]
---

## Highlights

> The most effective way to change your habits...

[[Notes/Habit Formation]]
```

## Notion Export

Syncs highlights to a Notion database.

### Setup

1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Share your database with the integration
3. Add your API key in Lektr settings

### Database Schema

Lektr creates/updates these properties:
- Title (text)
- Author (text)
- Highlight (text)
- Note (text)
- Tags (multi-select)
- Source (select)

## Readwise Export

Push highlights to your Readwise library.

### Setup

1. Get your API token from [readwise.io/access_token](https://readwise.io/access_token)
2. Add it in Lektr export settings

### What Syncs

- Highlight content
- Book metadata
- Notes
- Tags

## Selective Export

You can export:
- **All highlights** - Your entire library
- **Specific books** - Select books to export
- **Tagged highlights** - Export by tag
