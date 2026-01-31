// Highlight type for export - matches db schema
export interface Highlight {
  id: string;
  bookId: string;
  userId: string;
  content: string;
  originalContent: string | null;
  note: string | null;
  chapter: string | null;
  page: number | null;
  highlightedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportResult {
  type: "file" | "url" | "json";
  data?: string | Buffer;
  contentType?: string;
  filename?: string;
  url?: string;
  message?: string;
}

export interface BookWithHighlights {
  id: string;
  title: string;
  author: string | null;
  coverImageUrl: string | null;
  highlights: Highlight[];
}

export interface ExportOptions {
  userId: string;
  bookIds?: string[]; // Empty/undefined = all books
  includeNotes?: boolean;
  includeTags?: boolean;
  targetConfig?: Record<string, unknown>;
}

export interface ExportProvider {
  id: string;
  name: string;
  description: string;
  icon?: string;
  fileExtension?: string;
  requiresAuth: boolean;

  export(
    books: BookWithHighlights[],
    options: ExportOptions
  ): Promise<ExportResult>;
}

export interface ExportProviderInfo {
  id: string;
  name: string;
  description: string;
  icon?: string;
  requiresAuth: boolean;
}
