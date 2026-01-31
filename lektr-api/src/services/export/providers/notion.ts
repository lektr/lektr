import type { ExportProvider, ExportResult, BookWithHighlights, ExportOptions } from "../types";

/**
 * Notion Exporter
 * Requires user to provide their Notion Internal Integration Token and a target Page ID.
 * 
 * How it works:
 * 1. User creates an Internal Integration at https://www.notion.so/my-integrations
 * 2. User shares a page with the integration
 * 3. User provides the integration token and page ID to Lektr
 * 4. Lektr appends highlight blocks to that page
 */
export class NotionExporter implements ExportProvider {
  id = "notion";
  name = "Notion";
  description = "Push highlights directly to a Notion page";
  icon = "📓";
  requiresAuth = true;

  async export(
    books: BookWithHighlights[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const config = options.targetConfig || {};
    const token = config.notionToken as string;
    const pageId = config.notionPageId as string;

    if (!token || !pageId) {
      return {
        type: "json",
        message: "Notion export requires 'notionToken' and 'notionPageId' in config",
      };
    }

    try {
      for (const book of books) {
        await this.appendBookToNotion(token, pageId, book, options);
      }

      return {
        type: "json",
        message: `Successfully exported ${books.length} book(s) to Notion`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        type: "json",
        message: `Notion export failed: ${errorMessage}`,
      };
    }
  }

  private async appendBookToNotion(
    token: string,
    pageId: string,
    book: BookWithHighlights,
    options: ExportOptions
  ): Promise<void> {
    const blocks: NotionBlock[] = [];

    // Book heading
    blocks.push({
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: book.title } }],
      },
    });

    // Author
    if (book.author) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: "by " } },
            { type: "text", text: { content: book.author }, annotations: { italic: true } },
          ],
        },
      });
    }

    // Divider
    blocks.push({ object: "block", type: "divider", divider: {} });

    // Highlights
    for (const highlight of book.highlights) {
      // Quote block
      blocks.push({
        object: "block",
        type: "quote",
        quote: {
          rich_text: [{ type: "text", text: { content: highlight.content } }],
        },
      });

      // Location caption
      const location = [
        highlight.chapter,
        highlight.page ? `Page ${highlight.page}` : null,
      ].filter(Boolean).join(" · ");

      if (location) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              { type: "text", text: { content: `— ${location}` }, annotations: { italic: true, color: "gray" } },
            ],
          },
        });
      }

      // Note as callout
      if (options.includeNotes !== false && highlight.note) {
        blocks.push({
          object: "block",
          type: "callout",
          callout: {
            icon: { type: "emoji", emoji: "💭" },
            rich_text: [{ type: "text", text: { content: highlight.note } }],
          },
        });
      }
    }

    // Notion API allows max 100 blocks per request
    const chunkSize = 100;
    for (let i = 0; i < blocks.length; i += chunkSize) {
      const chunk = blocks.slice(i, i + chunkSize);
      await this.appendBlocks(token, pageId, chunk);
    }
  }

  private async appendBlocks(token: string, pageId: string, blocks: NotionBlock[]): Promise<void> {
    const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ children: blocks }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Notion API error (${response.status}): ${errorBody}`);
    }
  }
}

// Simplified Notion block types for our use case
interface NotionBlock {
  object: "block";
  type: string;
  [key: string]: unknown;
}
