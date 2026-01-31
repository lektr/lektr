---
sidebar_position: 1
---

# Importing Highlights

Lektr supports importing highlights from multiple sources.

## Supported Sources

| Source | Format | Features |
|--------|--------|----------|
| **Kindle** | `My Clippings.txt` | Highlights, notes, locations |
| **KOReader** | JSON export | Highlights, notes, chapters |
| **Readwise** | CSV/JSON | Full metadata |
| **Manual** | Web form | Any source |

## Kindle Import

### Getting Your Clippings File

1. Connect your Kindle via USB
2. Navigate to `Kindle/documents/My Clippings.txt`
3. Copy the file to your computer

### Importing

1. Go to **Import** in Lektr
2. Select **Kindle** as the source
3. Upload your `My Clippings.txt` file
4. Review the import preview
5. Click **Import**

### What Gets Imported

- Highlight text
- Notes (linked to highlights)
- Book title and author
- Location and page numbers (when available)

## KOReader Import

### Exporting from KOReader

1. Open your book in KOReader
2. Go to **Tools → Export highlights**
3. Choose **JSON** format
4. Transfer the file to your computer

### Importing

1. Go to **Import** in Lektr
2. Select **KOReader** as the source
3. Upload your JSON file
4. Click **Import**

## Manual Entry

For quotes from physical books or other sources:

1. Go to **Import** → **Add Highlight**
2. Enter the book title and author
3. Paste or type your highlight
4. Add optional note, chapter, and page
5. Click **Save**

## Duplicate Detection

Lektr automatically detects and skips duplicate highlights based on:
- Same book (title + author match)
- Same highlight content

This allows you to re-import updated clippings files without creating duplicates.

## Post-Import

After importing:
- Book covers are automatically fetched from Hardcover.app
- Highlights are ready for review
- Tags can be added to organize content
