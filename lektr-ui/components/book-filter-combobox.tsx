"use client";

import { useState, useRef, useEffect } from "react";

interface BookFilter {
  id: string;
  title: string;
  author?: string;
  count: number;
}

interface BookFilterComboboxProps {
  books: BookFilter[];
  selectedBookId: string | null;
  onSelect: (bookId: string | null) => void;
  totalResults: number;
}

export function BookFilterCombobox({
  books,
  selectedBookId,
  onSelect,
  totalResults,
}: BookFilterComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter books by search
  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(search.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(search.toLowerCase()))
  );

  // Get selected book info
  const selectedBook = books.find((b) => b.id === selectedBookId);

  const handleSelect = (bookId: string | null) => {
    onSelect(bookId);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 10);
          }
        }}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          {selectedBook ? (
            <div>
              <div className="font-medium truncate">{selectedBook.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {selectedBook.author || "Unknown author"} · {selectedBook.count} results
              </div>
            </div>
          ) : (
            <div>
              <div className="font-medium">All Books</div>
              <div className="text-xs text-muted-foreground">{totalResults} results</div>
            </div>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search books..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-muted border-0 focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Options */}
          <div className="max-h-64 overflow-y-auto">
            {/* All Books option */}
            <button
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors ${
                selectedBookId === null ? "bg-primary/10 text-primary" : ""
              }`}
            >
              <span className="font-medium">All Books</span>
              <span className="text-xs text-muted-foreground">{totalResults}</span>
            </button>

            <div className="border-t border-border" />

            {/* Filtered Books */}
            {filteredBooks.length === 0 ? (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                No books match "{search}"
              </div>
            ) : (
              filteredBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => handleSelect(book.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors ${
                    selectedBookId === book.id ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="font-medium truncate">{book.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {book.author || "Unknown author"}
                    </div>
                  </div>
                  <span className="badge flex-shrink-0">{book.count}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
