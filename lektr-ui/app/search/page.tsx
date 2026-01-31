"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { searchHighlights, getEmbeddingStatus, generateEmbeddings, getCoverUrl } from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { BookFilterCombobox } from "@/components/book-filter-combobox";
import { TagBadge } from "@/components/tag-badge";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  
  const [query, setQuery] = useState(initialQuery);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  // Update when URL changes (e.g., from navbar search)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q) {
      setQuery(q);
      setSearchQuery(q);
      setSelectedBookId(null); // Reset filter on new search
    }
  }, [searchParams]);

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["embedding-status"],
    queryFn: getEmbeddingStatus,
    refetchInterval: 5000,
  });

  const { data: results, isLoading: searching, error } = useQuery({
    queryKey: ["search", searchQuery],
    queryFn: () => searchHighlights(searchQuery),
    enabled: searchQuery.length > 0,
  });

  const generateMutation = useMutation({
    mutationFn: generateEmbeddings,
    onSuccess: () => refetchStatus(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchQuery(query.trim());
      setSelectedBookId(null); // Reset book filter on new search
    }
  };



  // Compute book filters from results
  const bookFilters = useMemo(() => {
    if (!results?.results) return [];
    
    const bookCounts = new Map<string, { id: string; title: string; author?: string; count: number }>();
    
    for (const result of results.results) {
      const existing = bookCounts.get(result.bookId);
      if (existing) {
        existing.count++;
      } else {
        bookCounts.set(result.bookId, {
          id: result.bookId,
          title: result.bookTitle,
          author: result.bookAuthor,
          count: 1,
        });
      }
    }
    
    return Array.from(bookCounts.values()).sort((a, b) => b.count - a.count);
  }, [results]);

  // Filter results by selected book
  const filteredResults = useMemo(() => {
    if (!results?.results) return [];
    if (!selectedBookId) return results.results;
    return results.results.filter((r) => r.bookId === selectedBookId);
  }, [results, selectedBookId]);

  const pendingEmbeddings = status?.embeddings.pending || 0;
  const totalEmbeddings = (status?.embeddings.complete || 0) + pendingEmbeddings;

  return (
    <AuthGuard>
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 sm:pt-8 sm:pb-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <header className="mb-8 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Semantic Search</h1>
            <p className="text-muted-foreground">Find similar highlights using AI-powered semantic search.</p>
          </header>

          {/* Embedding Status */}
          {status && (
            <div className="mb-6 card p-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">{status.embeddings.complete} of {totalEmbeddings} highlights indexed</div>
                  {status.queue.processing && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      Processing embeddings...
                    </div>
                  )}
                </div>
                {pendingEmbeddings > 0 && !status.queue.processing && (
                  <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="btn btn-primary text-sm w-full sm:w-auto">
                    {generateMutation.isPending ? "Starting..." : `Generate ${pendingEmbeddings} embeddings`}
                  </button>
                )}
              </div>
              {totalEmbeddings > 0 && (
                <div className="progress mt-4">
                  <div className="progress-bar" style={{ width: `${(status.embeddings.complete / totalEmbeddings) * 100}%` }} />
                </div>
              )}
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for concepts, ideas, or topics..."
                className="w-full px-6 pr-32 py-4 text-base sm:text-lg rounded-2xl"
                autoComplete="off"
              />
              <button type="submit" disabled={!query.trim() || searching} className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary">
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          </form>



        {/* Results with Sidebar */}
        {error && (
          <div className="card p-4 bg-error/10 border-error/20 text-error mb-6">
            Search failed: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        )}

        {results && results.results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">🔍</div>
            No results found for "{searchQuery}"
          </div>
        )}

        {results && results.results.length > 0 && (
          <div className="animate-fade-in">
            {/* Filter and Result Count Row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <BookFilterCombobox
                books={bookFilters}
                selectedBookId={selectedBookId}
                onSelect={setSelectedBookId}
                totalResults={results.results.length}
              />
              <div className="text-sm text-muted-foreground">
                {selectedBookId 
                  ? `${filteredResults.length} highlights from selected book`
                  : `Found ${results.results.length} similar highlights`
                }
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredResults.map((result, i) => (
                <Link
                  key={result.id}
                  href={`/library/${result.bookId}`}
                  className="card card-interactive block animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex gap-4">
                    {result.coverImageUrl ? (
                      <img src={getCoverUrl(result.coverImageUrl) || undefined} alt="" className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded-lg flex-shrink-0" loading="lazy" />
                    ) : (
                      <div className="w-12 h-16 sm:w-14 sm:h-20 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">📖</div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground leading-relaxed mb-2 line-clamp-3" style={{ fontFamily: "var(--font-literata), Georgia, serif" }}>
                        "{result.content}"
                      </p>
                      
                      {/* Tags on result */}
                      {result.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {result.tags.map((tag) => (
                            <TagBadge 
                              key={tag.id} 
                              name={tag.name} 
                              color={tag.color}
                              size="sm"
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{result.bookTitle}</span>
                        {result.bookAuthor && <span className="text-muted-foreground hide-mobile">by {result.bookAuthor}</span>}
                        <span className={`badge ml-auto ${result.tagBoost ? "badge-success" : "badge-primary"}`}>
                          {Math.round(result.similarity * 100)}% match
                          {result.tagBoost && " ✨"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">🔍</div>
            <h2 className="text-lg font-medium mb-2">Search your highlights</h2>
            <p className="text-muted-foreground max-w-sm mx-auto">Enter a topic or concept to find semantically similar passages from your library.</p>
          </div>
        )}
        </div>
      </div>
    </AuthGuard>
  );
}

