"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Book, ChevronDown, X, Check } from "lucide-react";
import { getBooks, getCoverUrl, type Book as BookType } from "@/lib/api";

export interface SelectedBook {
  id?: string;  // undefined = new book
  title: string;
  author: string;
  coverImageUrl?: string | null;
  isNew: boolean;
}

interface BookSelectorProps {
  value: SelectedBook | null;
  onChange: (book: SelectedBook | null) => void;
}

export function BookSelector({ value, onChange }: BookSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<"select" | "create">(value?.isNew ? "create" : "select");
  const [newTitle, setNewTitle] = useState(value?.isNew ? value.title : "");
  const [newAuthor, setNewAuthor] = useState(value?.isNew ? value.author : "");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: booksData, isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: getBooks,
    staleTime: 30000,
  });

  const books = booksData?.books ?? [];

  // Filter books by search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const query = searchQuery.toLowerCase();
    return books.filter(
      (book) =>
        book.title.toLowerCase().includes(query) ||
        (book.author?.toLowerCase().includes(query) ?? false)
    );
  }, [books, searchQuery]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When opening, focus input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectBook = (book: BookType) => {
    onChange({
      id: book.id,
      title: book.title,
      author: book.author ?? "",
      coverImageUrl: book.coverImageUrl,
      isNew: false,
    });
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleCreateNew = () => {
    setMode("create");
    setNewTitle(searchQuery);
    setNewAuthor("");
  };

  const handleConfirmNew = () => {
    if (!newTitle.trim()) return;
    onChange({
      title: newTitle.trim(),
      author: newAuthor.trim(),
      isNew: true,
    });
    setIsOpen(false);
    setMode("select");
    setSearchQuery("");
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery("");
    setNewTitle("");
    setNewAuthor("");
    setMode("select");
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Book Display / Trigger */}
      {value ? (
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl border border-border/50">
          {/* Cover or Placeholder */}
          {value.coverImageUrl ? (
            <img
              src={getCoverUrl(value.coverImageUrl) || ""}
              alt={value.title}
              className="w-12 h-16 object-cover rounded-lg shadow-sm"
            />
          ) : (
            <div className="w-12 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
              <Book className="w-5 h-5 text-primary/60" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">{value.title}</div>
            {value.author && (
              <div className="text-sm text-muted-foreground truncate">{value.author}</div>
            )}
            {value.isNew && (
              <span className="inline-flex items-center gap-1 text-xs text-primary mt-1">
                <Plus className="w-3 h-3" /> New book
              </span>
            )}
          </div>
          
          <button
            type="button"
            onClick={handleClear}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-3 bg-muted/50 hover:bg-muted/70 border-none rounded-full px-5 py-3 text-left transition-all cursor-pointer group"
        >
          <Search className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-muted-foreground flex-1">Search your library or add new book...</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 animate-fade-in">
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
            {/* Mode Toggle */}
            <div className="flex border-b border-border/50">
              <button
                type="button"
                onClick={() => setMode("select")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  mode === "select"
                    ? "text-primary bg-primary/5 border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Search className="w-4 h-4 inline mr-2" />
                Select Existing
              </button>
              <button
                type="button"
                onClick={() => setMode("create")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  mode === "create"
                    ? "text-primary bg-primary/5 border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Add New Book
              </button>
            </div>

            {mode === "select" ? (
              <>
                {/* Search Input */}
                <div className="p-3 border-b border-border/30">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type to search..."
                      className="w-full bg-muted/50 border-none rounded-full !pl-12 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>

                {/* Book List */}
                <div className="max-h-[280px] overflow-y-auto">
                  {isLoading ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      Loading books...
                    </div>
                  ) : filteredBooks.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-muted-foreground text-sm mb-3">
                        {searchQuery ? `No books found for "${searchQuery}"` : "No books in your library"}
                      </p>
                      <button
                        type="button"
                        onClick={handleCreateNew}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Create "{searchQuery || "New Book"}"
                      </button>
                    </div>
                  ) : (
                    <div className="py-2">
                      {filteredBooks.slice(0, 8).map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => handleSelectBook(book)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          {book.coverImageUrl ? (
                            <img
                              src={getCoverUrl(book.coverImageUrl) || ""}
                              alt={book.title}
                              className="w-10 h-14 object-cover rounded-md shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-gradient-to-br from-muted to-muted/50 rounded-md flex items-center justify-center">
                              <Book className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-foreground truncate">
                              {book.title}
                            </div>
                            {book.author && (
                              <div className="text-xs text-muted-foreground truncate">
                                {book.author}
                              </div>
                            )}
                          </div>
                          {book.highlightCount && (
                            <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-full">
                              {book.highlightCount}
                            </span>
                          )}
                        </button>
                      ))}
                      
                      {filteredBooks.length > 8 && (
                        <div className="px-4 py-2 text-xs text-muted-foreground text-center border-t border-border/30 mt-2">
                          +{filteredBooks.length - 8} more books
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Create New Book Form */
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Book Title <span className="text-error">*</span>
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Atomic Habits"
                    className="w-full bg-muted/50 border-none rounded-full px-5 py-3 text-foreground placeholder:text-muted-foreground/60"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Author <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="e.g. James Clear"
                    className="w-full bg-muted/50 border-none rounded-full px-5 py-3 text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleConfirmNew}
                  disabled={!newTitle.trim()}
                  className="w-full btn btn-primary rounded-full h-11 text-sm font-medium disabled:opacity-50"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Use This Book
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
