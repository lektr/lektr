"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getBook, deleteBook, deleteHighlight, updateBook, updateHighlight, getCoverUrl, getSettings, removeTagFromHighlight, removeTagFromBook, getBookStudyStats, type Highlight } from "@/lib/api";
import { EditBookModal } from "@/components/edit-book-modal";
import { EditHighlightModal } from "@/components/edit-highlight-modal";
import { TagList } from "@/components/tag-badge";
import { TagSelector } from "@/components/tag-selector";
import { BookTagSelector } from "@/components/book-tag-selector";
import { HighlightCard } from "@/components/highlight-card";
import { CardFormModal } from "@/components/card-form-modal";
import { BookCover } from "@/components/book-cover";
import { getBookGradient } from "@/lib/colors";
import { ChevronLeft, FileText, Search, Download, Edit2, Trash2, Tag, Zap } from "lucide-react";
import { ExportModal } from "@/components/export-modal";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const bookId = params.bookId as string;
  const targetHighlightId = searchParams.get("highlight");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditBook, setShowEditBook] = useState(false);
  const [highlightToDelete, setHighlightToDelete] = useState<{ id: string; preview: string } | null>(null);
  const [highlightToEdit, setHighlightToEdit] = useState<Highlight | null>(null);
  const [tagSelectorHighlight, setTagSelectorHighlight] = useState<string | null>(null);
  const [showBookTagSelector, setShowBookTagSelector] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [flashcardHighlight, setFlashcardHighlight] = useState<Highlight | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  // Fetch settings for collapse length (passed to cards)
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const COLLAPSE_LENGTH = parseInt(settingsData?.settings?.display_collapse_length?.value || "500", 10);

  const { data, isLoading, error } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => getBook(bookId),
  });

  // Scroll to target highlight when data loads and query param is present
  useEffect(() => {
    if (targetHighlightId && data?.highlights) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        const element = document.getElementById(`highlight-${targetHighlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedId(targetHighlightId);
          // Remove glow after animation
          setTimeout(() => setHighlightedId(null), 3000);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [targetHighlightId, data]);

  // Fetch study stats for the Smart Review button
  const { data: studyStats } = useQuery({
    queryKey: ["book-study-stats", bookId],
    queryFn: () => getBookStudyStats(bookId),
    staleTime: 30 * 1000, // 30 seconds
  });

  const deleteBookMutation = useMutation({
    mutationFn: () => deleteBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      router.push("/library");
    },
  });

  const deleteHighlightMutation = useMutation({
    mutationFn: (highlightId: string) => deleteHighlight(bookId, highlightId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book", bookId] });
    },
  });

  const updateBookMutation = useMutation({
    mutationFn: (data: { title: string; author: string }) => updateBook(bookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book", bookId] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setShowEditBook(false);
    },
  });

  const updateHighlightMutation = useMutation({
    mutationFn: ({ highlightId, data }: { highlightId: string; data: { content: string; note: string | null } }) =>
      updateHighlight(bookId, highlightId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["book", bookId] });
      setHighlightToEdit(null);
    },
  });

  // Derived State
  const toggleTag = (tagId: string) => {
    const newTags = new Set(activeTags);
    if (newTags.has(tagId)) {
      newTags.delete(tagId);
    } else {
      newTags.add(tagId);
    }
    setActiveTags(newTags);
  };

  const filteredHighlights = data?.highlights.filter(h => {
    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const contentMatch = h.content.toLowerCase().includes(q);
      const noteMatch = h.note?.toLowerCase().includes(q);
      if (!contentMatch && !noteMatch) return false;
    }

    // Tag Filter
    if (activeTags.size > 0) {
      if (!h.tags || h.tags.length === 0) return false;
      const hasTag = h.tags.some(t => activeTags.has(t.id));
      if (!hasTag) return false;
    }

    return true;
  }) || [];

  // Get all unique tags from highlights
  const allTags = data?.highlights.flatMap(h => h.tags || []) || [];
  const uniqueTagsMap = new Map();
  allTags.forEach(t => {
     if (!uniqueTagsMap.has(t.id)) {
       uniqueTagsMap.set(t.id, { ...t, count: 0 });
     }
     uniqueTagsMap.get(t.id).count++;
  });
  const uniqueTags = Array.from(uniqueTagsMap.values()).sort((a, b) => b.count - a.count);


  if (isLoading) {
    return (
      <div className="container py-12 flex justify-center">
        <div className="animate-pulse space-y-8 max-w-5xl w-full">
          <div className="flex gap-8">
            <div className="w-1/3 space-y-4">
               <div className="w-full aspect-[2/3] bg-muted rounded-xl" />
            </div>
            <div className="flex-1 space-y-4 py-4">
              <div className="h-10 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/2" />
              <div className="h-40 bg-muted rounded w-full mt-8" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container py-12">
        <div className="max-w-md mx-auto text-center border border-error/20 bg-error/5 rounded-xl p-6">
          <p className="text-error font-medium mb-2">Failed to load book</p>
          <p className="text-sm text-error/80 mb-4">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Link href="/library" className="btn btn-secondary text-sm">Return to Library</Link>
        </div>
      </div>
    );
  }

  const { book, highlights } = data;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-20 animate-fade-in relative">
      {/* Top Navigation / Breadcrumbs */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <Link
          href="/library"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-muted/50 -ml-3"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Library</span>
        </Link>
      </div>

      {/* Book Header (Single Column) */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 mb-10">
          {/* Cover */}
          <div className="shrink-0 mx-auto sm:mx-0">
              <BookCover book={book} size="md" className="w-32 sm:w-48" />
          </div>

          {/* Book Info & Actions */}
          <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left space-y-5">
              <div className="space-y-2">
                <h1
                  className={`font-serif font-bold tracking-tight text-foreground leading-tight ${
                    book.title.length > 60 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"
                  }`}
                >
                  {book.title}
                </h1>
                <p className="text-xl text-muted-foreground font-medium">
                  {book.author || "Unknown Author"}
                </p>
              </div>

              {/* Stats / Metadata */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground">
                 <span className="inline-flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
                   <FileText className="w-3.5 h-3.5" />
                   {highlights.length} highlights
                 </span>
                 {book.sourceType && (
                   <span className="capitalize opacity-80 bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
                     Via {book.sourceType}
                   </span>
                 )}
                 {book.tags && book.tags.length > 0 && (
                    <TagList tags={book.tags} size="xs" />
                 )}
              </div>

              {/* Primary Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 w-full">
                  <Link
                     href={`/study/book/${bookId}`}
                     className="btn btn-primary h-11 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2 font-semibold"
                   >
                     <Zap className="w-4 h-4" />
                     {studyStats?.dueCount && studyStats.dueCount > 0
                       ? `Review ${studyStats.dueCount} Due`
                       : studyStats?.highlightCount && studyStats.highlightCount > 0
                         ? "Review Highlights"
                         : "Start Review"
                     }
                   </Link>

                   <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-full border border-border/40">
                      <button
                        onClick={() => setShowBookTagSelector(true)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-full transition-all"
                        title="Tag Book"
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                      <div className="w-px h-4 bg-border/40" />
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-full transition-all"
                        title="Export"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <div className="w-px h-4 bg-border/40" />
                      <button
                        onClick={() => setShowEditBook(true)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-full transition-all"
                        title="Edit Metadata"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <div className="w-px h-4 bg-border/40" />
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-full transition-all"
                        title="Delete Book"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
              </div>
          </div>
      </div>

      {/* Sticky Search & Filter Bar */}
      <div className="sticky top-20 z-40 mb-8 -mx-2 px-2">
         <div className="bg-background/80 backdrop-blur-md border border-border/60 shadow-sm rounded-2xl p-2 sm:p-2.5 flex flex-col md:flex-row gap-3 md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <Search className="w-4 h-4" />
               </div>
               <input
                 type="text"
                 placeholder="Search highlights..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full h-10! min-h-0! py-0! pl-10! pr-4! rounded-xl bg-muted/50 border-none focus:ring-1 focus:ring-primary/20 text-sm transition-all leading-10 hover:bg-muted/80 placeholder:text-muted-foreground/60"
               />

               {/* Clear Search Button (if text exists) */}
               {searchQuery && (
                 <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                 >
                   <span className="sr-only">Clear</span>
                   <span className="block w-4 h-4 rounded-full bg-border/50 text-[10px] flex items-center justify-center text-foreground">✕</span>
                 </button>
               )}
            </div>

            {/* Tags / Actions */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
               {/* Vertical Divider */}
               {uniqueTags.length > 0 && <div className="w-px h-6 bg-border/40 mx-1 shrink-0" />}

               {/* Tag Filter Chips */}
               {uniqueTags.map((tag) => (
                 <button
                   key={tag.id}
                   onClick={() => toggleTag(tag.id)}
                   className={`
                     shrink-0 h-10 px-3.5 rounded-xl text-xs font-medium transition-all border flex items-center gap-1.5
                     ${activeTags.has(tag.id)
                       ? "bg-primary text-primary-foreground border-primary shadow-sm"
                       : "bg-card text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground"}
                   `}
                 >
                   #{tag.name}
                   <span className={`opacity-60 text-[10px] ${activeTags.has(tag.id) ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {tag.count}
                   </span>
                 </button>
               ))}
            </div>
         </div>
      </div>

      {/* Highlights Stream */}
           <div className="space-y-6">
             {filteredHighlights.length === 0 ? (
                <div className="text-center py-24 bg-muted/20 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                  <div className="w-16 h-16 mb-4 bg-muted rounded-full flex items-center justify-center opacity-50">
                    {searchQuery || activeTags.size > 0 ? (
                       <span className="text-2xl">🔍</span>
                    ) : (
                       <FileText className="w-8 h-8" />
                    )}
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    {searchQuery || activeTags.size > 0 ? "No matches found" : "No highlights yet"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    {searchQuery || activeTags.size > 0
                      ? "Try adjusting your filters or search terms."
                      : "Start reading and adding highlights to see them here."}
                  </p>
                  {(searchQuery || activeTags.size > 0) && (
                    <button
                      onClick={() => { setSearchQuery(""); setActiveTags(new Set()); }}
                      className="mt-4 text-sm text-primary hover:underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
             ) : (
               filteredHighlights.map((highlight) => (
                 <div
                   key={highlight.id}
                   id={`highlight-${highlight.id}`}
                   className={`transition-all duration-500 rounded-xl ${
                     highlightedId === highlight.id
                       ? "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
                       : ""
                   }`}
                 >
                   <HighlightCard
                     highlight={highlight}
                     collapseLength={COLLAPSE_LENGTH}
                     showBookInfo={false}
                     searchQuery={searchQuery}
                     onEdit={() => setHighlightToEdit(highlight)}
                     onDelete={() => setHighlightToDelete({
                       id: highlight.id,
                       preview: highlight.content.slice(0, 100)
                     })}
                     onAddTag={() => setTagSelectorHighlight(highlight.id)}
                     onCreateFlashcard={() => setFlashcardHighlight({ ...highlight, bookTitle: book.title })}
                   />
                 </div>
               ))
             )}

             {/* Results Count Footer */}
             {filteredHighlights.length > 0 && (
               <div className="text-center py-8 text-xs text-muted-foreground opacity-60">
                 Showing {filteredHighlights.length} of {highlights.length} highlights
               </div>
             )}
           </div>

      {/* Modals */}
      {showEditBook && (
        <EditBookModal
          book={book}
          onClose={() => setShowEditBook(false)}
          onSave={async (data) => {
            await updateBookMutation.mutateAsync(data);
          }}
          onCoverRefreshed={() => {
            queryClient.invalidateQueries({ queryKey: ["book", bookId] });
            queryClient.invalidateQueries({ queryKey: ["books"] });
          }}
          isSaving={updateBookMutation.isPending}
        />
      )}

      {highlightToEdit && (
        <EditHighlightModal
          highlight={highlightToEdit}
          onClose={() => setHighlightToEdit(null)}
          onSave={async (data) => {
            if (!highlightToEdit) return;
            await updateHighlightMutation.mutateAsync({ highlightId: highlightToEdit.id, data });
          }}
          isSaving={updateHighlightMutation.isPending}
        />
      )}

      {showBookTagSelector && (
         <BookTagSelector
           bookId={bookId}
           currentTags={book.tags || []}
           onClose={() => setShowBookTagSelector(false)}
         />
      )}

      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          bookIds={[bookId]}
          bookTitle={book.title}
        />
      )}

      {tagSelectorHighlight && (
        <TagSelector
          highlightId={tagSelectorHighlight}
          bookId={bookId}
          currentTags={highlights.find(h => h.id === tagSelectorHighlight)?.tags || []}
          onClose={() => setTagSelectorHighlight(null)}
        />
      )}

      {flashcardHighlight && (
        <CardFormModal
          isOpen={true}
          highlight={flashcardHighlight}
          onClose={() => setFlashcardHighlight(null)}
        />
      )}

      {/* Delete Book Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl border border-border">
            <h3 className="text-lg font-serif font-bold mb-2">Move to Trash?</h3>
            <p className="text-muted-foreground text-sm mb-6">
              All {highlights.length} highlights from "{book.title}" will be moved to Trash. You can restore them later from the Trash page.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteBookMutation.mutate()}
                disabled={deleteBookMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-full bg-error text-white hover:bg-error/90 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {deleteBookMutation.isPending ? "Moving..." : "Move to Trash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Highlight Confirmation */}
      {highlightToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl border border-border">
            <h3 className="text-lg font-serif font-bold mb-2">Delete Highlight?</h3>
            <div className="bg-muted/30 p-3 rounded-lg border-l-2 border-primary/30 mb-6 pixel-antialiased">
              <p className="text-sm italic text-muted-foreground line-clamp-3">"{highlightToDelete.preview}"</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setHighlightToDelete(null)}
                className="px-4 py-2 text-sm font-medium rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!highlightToDelete) return;
                  deleteHighlightMutation.mutate(highlightToDelete.id);
                  setHighlightToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-full bg-error text-white hover:bg-error/90 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
