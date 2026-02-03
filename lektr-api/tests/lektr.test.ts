import { describe, expect, it } from "vitest";
import { LektrImporter } from "../src/importers/lektr";

describe("LektrImporter", () => {
  const importer = new LektrImporter();

  describe("validate", () => {
    it("should accept .md files with Lektr frontmatter", async () => {
      const content = `---
title: "Test Book"
author: "Test Author"
highlights: 2
exported: "2024-01-15T10:30:00.000Z"
---

# Test Book
*by Test Author*

> This is a highlight.
`;
      const file = new File([content], "lektr-export.md", { type: "text/markdown" });
      expect(await importer.validate(file)).toBe(true);
    });

    it("should reject non-.md files", async () => {
      const file = new File(["content"], "highlights.txt", { type: "text/plain" });
      expect(await importer.validate(file)).toBe(false);
    });

    it("should reject .md files without frontmatter", async () => {
      const content = `# Just a Regular Markdown File

This doesn't have YAML frontmatter.
`;
      const file = new File([content], "notes.md", { type: "text/markdown" });
      expect(await importer.validate(file)).toBe(false);
    });

    it("should reject .md files with frontmatter but no title", async () => {
      const content = `---
author: "Some Author"
highlights: 1
---

# Untitled
`;
      const file = new File([content], "notes.md", { type: "text/markdown" });
      expect(await importer.validate(file)).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse a single book with highlights", async () => {
      const content = `---
title: "The Great Gatsby"
author: "F. Scott Fitzgerald"
highlights: 2
exported: "2024-01-15T10:30:00.000Z"
---

# The Great Gatsby
*by F. Scott Fitzgerald*

**2 highlights**

> In my younger and more vulnerable years my father gave me some advice.

> So we beat on, boats against the current.
`;
      const file = new File([content], "gatsby.md", { type: "text/markdown" });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("The Great Gatsby");
      expect(result[0].author).toBe("F. Scott Fitzgerald");
      expect(result[0].highlights).toHaveLength(2);
      expect(result[0].highlights[0].content).toContain("In my younger");
      expect(result[0].highlights[1].content).toContain("So we beat on");
    });

    it("should parse highlights with location info (chapter and page)", async () => {
      const content = `---
title: "Atomic Habits"
author: "James Clear"
highlights: 1
exported: "2024-01-15T10:30:00.000Z"
---

# Atomic Habits
*by James Clear*

**1 highlights**

> The most effective way to change your habits is to focus on who you wish to become.
> — *Chapter 2: Identity, Page 42*
`;
      const file = new File([content], "habits.md", { type: "text/markdown" });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].highlights).toHaveLength(1);
      expect(result[0].highlights[0].chapter).toBe("Chapter 2: Identity");
      expect(result[0].highlights[0].page).toBe(42);
    });

    it("should parse highlights with notes", async () => {
      const content = `---
title: "Test Book"
author: "Test Author"
highlights: 1
exported: "2024-01-15T10:30:00.000Z"
---

# Test Book
*by Test Author*

**1 highlights**

> This is an important quote.

**Note:** This quote really resonated with me.
`;
      const file = new File([content], "test.md", { type: "text/markdown" });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].highlights).toHaveLength(1);
      expect(result[0].highlights[0].content).toBe("This is an important quote.");
      expect(result[0].highlights[0].note).toBe("This quote really resonated with me.");
    });

    it("should parse multiple books separated by horizontal rules", async () => {
      const content = `---
title: "Book One"
author: "Author A"
highlights: 1
exported: "2024-01-15T10:30:00.000Z"
---

# Book One
*by Author A*

**1 highlights**

> Highlight from book one.

---

---
title: "Book Two"
author: "Author B"
highlights: 1
exported: "2024-01-15T10:30:00.000Z"
---

# Book Two
*by Author B*

**1 highlights**

> Highlight from book two.
`;
      const file = new File([content], "multi.md", { type: "text/markdown" });
      const result = await importer.parse(file);

      expect(result).toHaveLength(2);
      expect(result.map((b) => b.title).sort()).toEqual(["Book One", "Book Two"]);
      expect(result[0].highlights).toHaveLength(1);
      expect(result[1].highlights).toHaveLength(1);
    });

    it("should handle books without author", async () => {
      const content = `---
title: "Anonymous Document"
highlights: 1
exported: "2024-01-15T10:30:00.000Z"
---

# Anonymous Document

**1 highlights**

> A quote from an anonymous source.
`;
      const file = new File([content], "anon.md", { type: "text/markdown" });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Anonymous Document");
      expect(result[0].author).toBeUndefined();
    });

    it("should handle highlights with page only (no chapter)", async () => {
      const content = `---
title: "Test"
author: "Author"
highlights: 1
exported: "2024-01-15T10:30:00.000Z"
---

# Test
*by Author*

**1 highlights**

> A quote.
> — *Page 100*
`;
      const file = new File([content], "test.md", { type: "text/markdown" });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].highlights[0].page).toBe(100);
      expect(result[0].highlights[0].chapter).toBeUndefined();
    });

    it("should handle highlights with chapter only (no page)", async () => {
      const content = `---
title: "Test"
author: "Author"
highlights: 1
exported: "2024-01-15T10:30:00.000Z"
---

# Test
*by Author*

**1 highlights**

> A quote.
> — *Prologue*
`;
      const file = new File([content], "test.md", { type: "text/markdown" });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].highlights[0].chapter).toBe("Prologue");
      expect(result[0].highlights[0].page).toBeUndefined();
    });

    it("should handle escaped quotes in title", async () => {
      const content = `---
title: "Book with \\"Quotes\\" in Title"
author: "Author"
highlights: 1
exported: "2024-01-15T10:30:00.000Z"
---

# Book with "Quotes" in Title
*by Author*

**1 highlights**

> A highlight.
`;
      const file = new File([content], "test.md", { type: "text/markdown" });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Book with "Quotes" in Title');
    });

    it("should handle multi-line highlights", async () => {
      const content = `---
title: "Test"
author: "Author"
highlights: 1
exported: "2024-01-15T10:30:00.000Z"
---

# Test
*by Author*

**1 highlights**

> This is a multi-line highlight.
> It continues on a second line.
> And a third line.
`;
      const file = new File([content], "test.md", { type: "text/markdown" });
      const result = await importer.parse(file);

      expect(result).toHaveLength(1);
      expect(result[0].highlights[0].content).toBe(
        "This is a multi-line highlight.\nIt continues on a second line.\nAnd a third line."
      );
    });
  });
});
