"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getBook, deleteBook, deleteHighlight, updateBook, updateHighlight, getCoverUrl, getSettings, removeTagFromHighlight, removeTagFromBook, type Highlight } from "@/lib/api";
import { EditBookModal } from "@/components/edit-book-modal";
import { EditHighlightModal } from "@/components/edit-highlight-modal";
import { TagList } from "@/components/tag-badge";
import { TagSelector } from "@/components/tag-selector";
import { BookTagSelector } from "@/components/book-tag-selector";
import { HighlightCard } from "@/components/highlight-card";
import { BookCover } from "@/components/book-cover";
import { getBookGradient } from "@/lib/colors";
import { ChevronLeft, Edit2, Trash2, MoreHorizontal, FileText, ChevronDown, ChevronUp, Download } from "lucide-react";
import { ExportModal } from "@/components/export-modal";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookId = params.bookId as string;
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditBook, setShowEditBook] = useState(false);
  const [highlightToDelete, setHighlightToDelete] = useState<{ id: string; preview: string } | null>(null);
  const [highlightToEdit, setHighlightToEdit] = useState<Highlight | null>(null);
  const [tagSelectorHighlight, setTagSelectorHighlight] = useState<string | null>(null);
  const [showBookTagSelector, setShowBookTagSelector] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

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

  if (isLoading) {
    return (
      <div className="container py-12 flex justify-center">
        <div className="animate-pulse space-y-8 max-w-3xl w-full">
          <div className="flex gap-6">
            <div className="w-32 h-48 bg-muted rounded-xl" />
            <div className="space-y-4 flex-1 py-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/2" />
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

    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-8 sm:pt-8 sm:pb-12 animate-fade-in">
      {/* Top Navigation / Breadcrumbs */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/library" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-muted/50 -ml-3"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Library</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-8 lg:gap-12 items-start">
        {/* Left Sidebar (Sticky) */}
        <aside className="space-y-6 md:sticky md:top-24">
          <div className="relative group">
            <BookCover book={book} />
            
            {/* Quick Stats Overlay (Desktop) */}
            <div className="absolute top-3 right-3 md:right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              {highlights.length}
            </div>
          </div>

          <div className="space-y-4 text-center md:text-left">
             <div className="flex flex-col gap-2">
                {book.sourceType && (
                  <div className="text-sm font-medium text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                    {book.sourceType === 'web' ? 'Web Highlight' : 
                     book.sourceType === 'kindle' ? 'Kindle Import' :
                     book.sourceType === 'koreader' ? 'KOReader Import' :
                     book.sourceType === 'readwise' ? 'Readwise Import' :
                     book.sourceType === 'manual' ? 'Manual Entry' :
                     `${book.sourceType} Import`}
                  </div>
                )}
                <div className="text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                   <FileText className="w-4 h-4" />
                   {highlights.length} {highlights.length === 1 ? 'highlight' : 'highlights'}
                </div>
             </div>

             <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <TagList tags={book.tags || []} />
              <button
                onClick={() => setShowBookTagSelector(true)}
                className="text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 px-3 py-1 rounded-full transition-colors border border-dashed border-border hover:border-primary/30 cursor-pointer"
              >
                + Tag
              </button>
            </div>
            

          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0">
          {/* Header Actions */}
          <div className="flex flex-col gap-6 mb-8">
             <div className="w-full">
                <h1 
                  className={`font-serif font-bold tracking-tight text-foreground mb-2 leading-tight break-words ${
                    book.title.length > 100 
                      ? "text-2xl sm:text-3xl md:text-4xl" 
                      : book.title.length > 60 
                        ? "text-3xl sm:text-4xl md:text-5xl" 
                        : "text-4xl sm:text-5xl md:text-6xl"
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {book.title}
                </h1>
                <p className="text-xl text-muted-foreground font-medium">
                  {book.author || "Unknown Author"}
                </p>
             </div>
             
             <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Link href={`/review`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-secondary/10 hover:bg-secondary/20 rounded-full transition-colors cursor-pointer">
                  <span className="text-lg">🧠</span> <span>Review</span>
                </Link>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors cursor-pointer"
                  title="Export Highlights"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                
                <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
                
                <button
                  onClick={() => setShowEditBook(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors cursor-pointer"
                  title="Edit Metadata"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="sr-only sm:not-sr-only sm:inline-block">Edit</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-error/80 hover:text-error hover:bg-error/10 rounded-full transition-colors cursor-pointer"
                  title="Delete Book"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="inline-block">Delete</span>
                </button>
             </div>
          </div>

          {/* Highlights Stream */}
          <div className="space-y-6">
            {highlights.length === 0 ? (
               <div className="text-center py-24 bg-muted/20 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                 <div className="w-16 h-16 mb-4 bg-muted rounded-full flex items-center justify-center opacity-50">
                   <FileText className="w-8 h-8" />
                 </div>
                 <p className="text-lg font-medium text-foreground">No highlights yet</p>
                 <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                   This book creates a nice space on your shelf, but needs some highlights to come alive.
                 </p>
               </div>
            ) : (
              highlights.map((highlight) => (
                <HighlightCard
                  key={highlight.id}
                  highlight={highlight}
                  collapseLength={COLLAPSE_LENGTH}
                  showBookInfo={false}
                  onEdit={() => setHighlightToEdit(highlight)}
                  onDelete={() => setHighlightToDelete({
                    id: highlight.id,
                    preview: highlight.content.slice(0, 100)
                  })}
                  onAddTag={() => setTagSelectorHighlight(highlight.id)}
                />
              ))
            )}
          </div>
        </main>
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

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        bookIds={[bookId]}
        bookTitle={book.title}
      />
      
      {tagSelectorHighlight && (
        <TagSelector
          highlightId={tagSelectorHighlight}
          bookId={bookId}
          currentTags={highlights.find(h => h.id === tagSelectorHighlight)?.tags || []}
          onClose={() => setTagSelectorHighlight(null)}
        />
      )}

      {/* Delete Book Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl border border-border">
            <h3 className="text-lg font-serif font-bold mb-2">Delete Book?</h3>
            <p className="text-muted-foreground text-sm mb-6">
              This will permanently delete "{book.title}" and all {highlights.length} highlights. This action cannot be undone.
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
                {deleteBookMutation.isPending ? "Deleting..." : "Delete Permanently"}
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
