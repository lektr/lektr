import type { ParsedBook, SourceType } from "../types";

/**
 * BaseImporter - Strategy Pattern interface for highlight importers.
 * All importers (KOReader, Kindle, Web, etc.) must implement this interface.
 */
export interface BaseImporter {
  /**
   * The source type this importer handles.
   */
  readonly sourceType: SourceType;

  /**
   * Validate that the file can be processed by this importer.
   * @param file - The uploaded file
   * @returns true if the file is valid for this importer
   */
  validate(file: File): Promise<boolean>;

  /**
   * Parse the file and extract books with their highlights.
   * @param file - The uploaded file
   * @returns Array of parsed books with their highlights
   */
  parse(file: File): Promise<ParsedBook[]>;
}
