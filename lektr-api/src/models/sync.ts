interface TableChanges {
  created: any[];
  updated: any[];
  deleted: string[];
}
export interface SyncResponse {
  changes: {
    books: TableChanges;
    highlights: TableChanges;
    decks: TableChanges;
    flashcards: TableChanges;
  };
  timestamp: number;
}
