
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getBooks, removeTagFromBook, toggleBookPin, type Book } from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { ExportModal } from "@/components/export-modal";
import { PageHeader } from "@/components/page-header";
import { BookTagSelector } from "@/components/book-tag-selector";
import { BookCard } from "@/components/book-card";
import { Tag, Pin, Download, Upload, Search, ArrowUpDown, LayoutGrid, List, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Client-side filtering and sorting
  const filteredBooks = useMemo(() => {
    if (!data?.books) return [];

    // Filter out books with no highlights
    let result = data.books.filter((b) => b.highlightCount > 0);

    // Filter
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
  }, [data?.books, searchQuery, sortBy]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(BOOKS_PER_PAGE);
  }, [searchQuery, sortBy]);

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
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center bg-card p-1 rounded-2xl border border-border/40 shadow-sm">
            {/* Search */}
            <div className="relative flex-1 w-full sm:w-auto">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none w-4 h-4"
              />
              <input
                type="text"
                placeholder="Search title, author, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full !h-10 !min-h-0 !py-0 !pl-10 !pr-4 rounded-full bg-muted/50 border-none focus:ring-1 focus:ring-primary/20 text-sm transition-all leading-10 hover:bg-muted/80"
              />
            </div>

            <div className="flex gap-3 items-center w-full sm:w-auto justify-between sm:justify-end">
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
              {searchQuery ? `No matches for "${searchQuery}"` : "Your library is empty"}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="btn btn-secondary"
              >
                Clear Search
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
                  />
                ) : (
                  <div key={book.id} className="p-4 rounded-xl border border-border/50 hover:border-border hover:shadow-sm transition-all bg-card flex items-center gap-4 group">
                    {/* List View Item */}
                    <Link href={`/library/${book.id}`} className="flex-1 flex items-center gap-4 min-w-0">
                      <div className="font-semibold text-lg w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs relative">
                        {book.title.charAt(0)}
                        {book.pinnedAt && (
                          <div className="absolute -top-1 -left-1 bg-primary text-primary-foreground p-0.5 rounded-full shadow-sm">
                            <Pin className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{book.title}</h3>
                          {book.pinnedAt && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{book.author || "Unknown Author"}</p>
                      </div>
                    </Link>
                    <div className="text-sm text-muted-foreground hidden sm:block">
                      {book.highlightCount} highlights
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePinClick(book.id)}
                        className={`!w-8 !h-8 !min-w-0 !min-h-0 !p-0 rounded-full flex items-center justify-center transition-colors border cursor-pointer ${
                          book.pinnedAt
                            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/80"
                            : "bg-muted/50 text-foreground border-transparent hover:bg-muted"
                        }`}
                        title={book.pinnedAt ? "Unpin" : "Pin to top"}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTagSelectorBookId(book.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit Tags</span>
                        <span className="sm:hidden">Tags</span>
                      </button>
                    </div>
                  </div>
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


