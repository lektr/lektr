
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getBooks, removeTagFromBook, toggleBookPin, deleteBook, type Book } from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { ExportModal } from "@/components/export-modal";
import { PageHeader } from "@/components/page-header";
import { BookTagSelector } from "@/components/book-tag-selector";
import { BookCard } from "@/components/book-card";
import { BookListCard } from "@/components/book-list-card";
import { Tag, Pin, Download, Upload, Search, ArrowUpDown, LayoutGrid, List, Trash2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryFilters, type LibraryFilterState } from "@/components/library-filters";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { BulkTagSelector } from "@/components/bulk-tag-selector";
import { toast } from "sonner";


type SortOption = "recent" | "title" | "author" | "highlights";
type ViewOption = "grid" | "list";

const BOOKS_PER_PAGE = 18;

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const [tagSelectorBookId, setTagSelectorBookId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  // Controls state - initialize from localStorage
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("library-sort") as SortOption) || "recent";
    }
    return "recent";
  });
  const [view, setView] = useState<ViewOption>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("library-view") as ViewOption) || "grid";
    }
    return "grid";
  });

  // Persist preferences to localStorage
  useEffect(() => {
    localStorage.setItem("library-sort", sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem("library-view", view);
  }, [view]);

  // Lazy loading state
  const [visibleCount, setVisibleCount] = useState(BOOKS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["books"],
    queryFn: getBooks,
    refetchInterval: 5000,
  });

  // Filters state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<LibraryFilterState>({
    sources: [],
    status: [],
    tags: []
  });

  // Selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [showBulkTagSelector, setShowBulkTagSelector] = useState(false);

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedBookIds(new Set()); // Clear selection when toggling
  };

  // Toggle single book selection
  const toggleBookSelection = (bookId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
    const newSelected = new Set(selectedBookIds);
    if (newSelected.has(bookId)) {
      newSelected.delete(bookId);
    } else {
      newSelected.add(bookId);
    }
    setSelectedBookIds(newSelected);
  };

  // Bulk Delete Handler
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedBookIds.size} books? This cannot be undone.`)) {
      return;
    }

    try {
      const ids = Array.from(selectedBookIds);
      let successCount = 0;

      // Execute concurrently
      await Promise.all(ids.map(async (id) => {
        try {
          await deleteBook(id);
          successCount++;
        } catch (err) {
          console.error(`Failed to delete book ${id}`, err);
        }
      }));

      toast.success(`Deleted ${successCount} books`);
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setSelectedBookIds(new Set());
      setIsSelectionMode(false);
    } catch (err) {
      toast.error("Failed to delete some books");
    }
  };

  // Client-side filtering and sorting
  const filteredBooks = useMemo(() => {
    if (!data?.books) return [];

    let result = [...data.books];

    // Status filter: when no filter is active, hide books with 0 highlights
    // (imported empty books). Use "No Highlights" filter to see them explicitly.
    const showEmpty = filters.status.includes("no_highlights");
    const showHighlighted = filters.status.includes("has_highlights");
    const showPinned = filters.status.includes("pinned");

    if (filters.status.length > 0) {
      result = result.filter(b => {
        if (showPinned && b.pinnedAt) return true;
        if (showHighlighted && b.highlightCount > 0) return true;
        if (showEmpty && b.highlightCount === 0) return true;
        return false;
      });
    } else {
      result = result.filter((b) => b.highlightCount > 0);
    }

    // Source Filter
    if (filters.sources.length > 0) {
      result = result.filter(b => b.sourceType && filters.sources.includes(b.sourceType));
    }

    // Tag Filter
    if (filters.tags.length > 0) {
      result = result.filter(b =>
        b.tags && b.tags.some(t => filters.tags.includes(t.id))
      );
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q) ||
          b.tags?.some((t) => t.name.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      // Pinned books always first (sorted by pinnedAt desc)
      const aPinned = !!a.pinnedAt;
      const bPinned = !!b.pinnedAt;
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (aPinned && bPinned) {
        return new Date(b.pinnedAt!).getTime() - new Date(a.pinnedAt!).getTime();
      }

      // Then apply regular sort
      switch (sortBy) {
        case "recent":
          // Sort by most recent highlight, fall back to book creation date
          const aDate = a.lastHighlightedAt || a.createdAt;
          const bDate = b.lastHighlightedAt || b.createdAt;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        case "author":
          return (a.author || "").localeCompare(b.author || "");
        case "highlights":
          return b.highlightCount - a.highlightCount;
        default:
          return 0;
      }
    });

    return result;
  }, [data?.books, searchQuery, sortBy, filters]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(BOOKS_PER_PAGE);
  }, [searchQuery, sortBy, filters]);

  // Visible books (sliced for lazy rendering)
  const visibleBooks = useMemo(() => {
    return filteredBooks.slice(0, visibleCount);
  }, [filteredBooks, visibleCount]);

  const hasMore = visibleCount < filteredBooks.length;

  // Intersection observer for infinite scroll
  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount((prev) => Math.min(prev + BOOKS_PER_PAGE, filteredBooks.length));
    }
  }, [hasMore, filteredBooks.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Pin mutation
  const pinMutation = useMutation({
    mutationFn: toggleBookPin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });

  const handlePinClick = (bookId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    pinMutation.mutate(bookId);
  };

  const tagSelectorBook = data?.books.find(b => b.id === tagSelectorBookId);

  if (isLoading) {
    return <LibrarySkeleton />;
  }

  if (error) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 sm:pt-8 sm:pb-12">
        <div className="max-w-md mx-auto text-center py-12">
          <p className="text-error mb-4">
            {error instanceof Error ? error.message : "Failed to load library"}
          </p>
          <Link href="/login" className="btn btn-primary">
            Sign in to view your library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="container py-8 min-h-screen">
        <PageHeader
          title="Your Library"
          description={
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                📚 {filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                ✨ {filteredBooks.reduce((sum, b) => sum + b.highlightCount, 0)} highlights
              </span>
              {searchQuery && (
                <span className="text-xs text-muted-foreground">
                  filtered from {data?.books.length}
                </span>
              )}
            </div>
          }
          actions={
            <>
              <Link
                href="/trash"
                className="btn btn-secondary px-4 h-10"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Trash</span>
              </Link>
              <button
                onClick={() => setShowExportModal(true)}
                className="btn btn-secondary px-4 h-10 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export All</span>
              </button>
              <Link
                href="/sync"
                className="btn btn-primary px-4 h-10"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Sync Highlights</span>
              </Link>
            </>
          }
        >
          {/* Toolbar */}
          <div className="relative z-40 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center bg-card p-1 rounded-2xl border border-border/40 shadow-sm">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none w-4 h-4"
              />
              <input
                type="text"
                placeholder="Search title, author, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10! min-h-0! py-0! pl-10! pr-4! rounded-full bg-muted/50 border-none focus:ring-1 focus:ring-primary/20 text-sm transition-all leading-10 hover:bg-muted/80"
              />
            </div>

            <div className="w-px h-8 bg-border/50 mx-2 hidden sm:block" />

            {/* Advanced Filters */}
            <LibraryFilters
              filters={filters}
              onChange={setFilters}
              isOpen={isFilterOpen}
              onToggle={() => setIsFilterOpen(!isFilterOpen)}
              onClear={() => {
                setFilters({ sources: [], status: [], tags: [] });
                setSearchQuery("");
              }}
              resultCount={filteredBooks.length}
            />

            <div className="flex gap-3 items-center w-full sm:w-auto justify-between sm:justify-end">
              {/* Select Toggle */}
              <button
                onClick={toggleSelectionMode}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors border",
                  isSelectionMode
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                )}
              >
                <ListChecks className="w-4 h-4" />
                <span>{isSelectionMode ? "Done" : "Select"}</span>
              </button>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="!h-10 !min-h-0 !py-0 pl-4 !pr-12 appearance-none rounded-full bg-muted/50 border-none focus:ring-1 focus:ring-primary/20 text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                  title="Sort by"
                >
                  <option value="recent">Recent</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="author">Author</option>
                  <option value="highlights">Most Highlights</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex bg-muted/50 rounded-full p-1 gap-1 border border-transparent">
                <button
                  onClick={() => setView("grid")}
                  className={cn(
                    "!w-8 !h-8 !min-w-0 !min-h-0 !p-0 flex items-center justify-center rounded-full transition-all cursor-pointer",
                    view === "grid"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={cn(
                    "!w-8 !h-8 !min-w-0 !min-h-0 !p-0 flex items-center justify-center rounded-full transition-all cursor-pointer",
                    view === "list"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </PageHeader>

        {/* Content */}
        {filteredBooks.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
              <span className="text-4xl opacity-50">🔍</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">No books found</h2>
            <p className="text-muted-foreground mb-6">
              {searchQuery || filters.sources.length > 0 || filters.status.length > 0 || filters.tags.length > 0
                ? "No matches found for your active filters"
                : "Your library is empty"}
            </p>
            {searchQuery || filters.sources.length > 0 || filters.status.length > 0 || filters.tags.length > 0 ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilters({ sources: [], status: [], tags: [] });
                }}
                className="btn btn-secondary"
              >
                Clear filters
              </button>
            ) : (
              <Link href="/sync" className="btn btn-primary">
                Import your first book
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className={`animate-fade-in ${
              view === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
                : "space-y-3"
            }`}>
              {visibleBooks.map((book) => (
                view === "grid" ? (
                  <BookCard
                    key={book.id}
                    book={book}
                    onTagClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTagSelectorBookId(book.id);
                    }}
                    onPinClick={handlePinClick(book.id)}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedBookIds.has(book.id)}
                    onToggleSelect={() => toggleBookSelection(book.id)}
                  />
                ) : (
                  <BookListCard
                    key={book.id}
                    book={book}
                    onTagClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTagSelectorBookId(book.id);
                    }}
                    onPinClick={handlePinClick(book.id)}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedBookIds.has(book.id)}
                    onToggleSelect={() => toggleBookSelection(book.id)}
                  />
                )
              ))}
            </div>

            {/* Lazy load sentinel & indicator */}
            {hasMore && (
              <div
                ref={sentinelRef}
                className="flex justify-center py-8"
              >
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading more...
                </div>
              </div>
            )}

            {!hasMore && filteredBooks.length > BOOKS_PER_PAGE && (
              <p className="text-center text-muted-foreground text-sm py-6">
                Showing all {filteredBooks.length} books
              </p>
            )}
          </>
        )}
      {/* Book Tag Selector Modal */}
        {tagSelectorBookId && tagSelectorBook && (
          <BookTagSelector
            bookId={tagSelectorBookId}
            currentTags={tagSelectorBook.tags || []}
            onClose={() => setTagSelectorBookId(null)}
          />
        )}

        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          bookTitle="All Books"
        />

        {/* Bulk Actions */}
        <BulkActionBar
          selectedCount={selectedBookIds.size}
          onClearSelection={() => setSelectedBookIds(new Set())}
          onDelete={handleBulkDelete}
          onAddTags={() => setShowBulkTagSelector(true)}
        />

        {showBulkTagSelector && (
           <BulkTagSelector
             bookIds={Array.from(selectedBookIds)}
             onClose={() => setShowBulkTagSelector(false)}
             onSuccess={() => {
                setShowBulkTagSelector(false);
                setSelectedBookIds(new Set());
                setIsSelectionMode(false);
             }}
           />
        )}
      </div>
    </AuthGuard>
  );
}

function LibrarySkeleton() {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 sm:pt-8 sm:pb-12">
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-2">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-24" />
        </div>
        <div className="skeleton h-10 w-32 rounded-full" />
      </div>
      <div className="flex gap-4 mb-8">
        <div className="skeleton h-12 flex-1 rounded-full" />
        <div className="skeleton h-12 w-48 rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-3">
            <div className="skeleton w-full aspect-[2/3] rounded-xl" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}


