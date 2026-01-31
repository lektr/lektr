"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { getTag, updateTag, deleteTag, getCoverUrl, type Book } from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { BookCard } from "@/components/book-card";
import { HighlightCard } from "@/components/highlight-card";
import { cn } from "@/lib/utils";
import { TagModal } from "@/components/tag-modal";
import { PageHeader } from "@/components/page-header";
import { 
  ArrowLeft, 
  Hash, 
  PenLine,
  Trash2,
  Library,
  Quote
} from "lucide-react";

// Simple Tab Component
function TabButton({ 
  isActive, 
  onClick, 
  children, 
  count 
}: { 
  isActive: boolean; 
  onClick: () => void; 
  children: React.ReactNode; 
  count?: number 
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative pb-3 px-1 text-sm font-medium transition-colors
        ${isActive 
          ? "text-foreground" 
          : "text-muted-foreground hover:text-foreground/80"
        }
      `}
    >
      <span className="flex items-center gap-2">
        {children}
        {count !== undefined && (
          <span className={`
            px-2 py-0.5 rounded-full text-[10px] font-bold
            ${isActive 
              ? "bg-foreground/10 text-foreground" 
              : "bg-muted text-muted-foreground"
            }
          `}>
            {count}
          </span>
        )}
      </span>
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full layout-id-active-tab" />
      )}
    </button>
  );
}

export default function TagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tagId = params.tagId as string;
  const [activeTab, setActiveTab] = useState<"books" | "highlights">("books");

  const { data, isLoading, error } = useQuery({
    queryKey: ["tag", tagId],
    queryFn: () => getTag(tagId),
  });

  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string | null }) => 
      updateTag(tagId, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag", tagId] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTag(tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      router.push("/tags");
    },
  });

  const handleSaveTag = async (name: string, color: string | null) => {
    await updateMutation.mutateAsync({ name, color });
  };


  if (isLoading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-8 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded mb-12" />
        <div className="h-48 w-full bg-muted/50 rounded-3xl mb-12" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[2/3] bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-4">
          <Hash className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Tag not found</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {error instanceof Error ? error.message : "This tag might have been deleted or doesn't exist."}
        </p>
        <Link href="/library" className="btn btn-primary">
          Back to Library
        </Link>
      </div>
    );
  }



  const { tag, books, highlights } = data;
  
  // Logic to handle both Hex and Tailwind Class colors
  const rawColor = tag.color || "#6b7280";
  const isHex = rawColor.startsWith("#");
  
  // For styles that require CSS color values
  const cssColorStyle = isHex ? { 
    backgroundColor: rawColor, 
    color: "#ffffff" 
  } : undefined;
  
  // Gradient overlay
  const gradientStyle = isHex ? {
    background: `linear-gradient(135deg, ${rawColor} 0%, transparent 60%)`
  } : {
    background: `linear-gradient(135deg, var(--muted) 0%, transparent 60%)`
  };

  // Map API response to Book interface expected by BookCard
  const mappedBooks: Book[] = books.map(b => ({
    ...b,
    userId: "", // not needed for display
    highlightCount: 0, // not in API yet
    tags: [], // not in API yet
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  // Map Highlights
  const mappedHighlights = highlights.map(h => ({
    ...h,
    userId: "",
    originalContent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    cfiRange: null,
    color: "yellow",
    position: 0,
    tags: [],
    // Join fields
    bookTitle: h.bookTitle,
    bookAuthor: h.bookAuthor
  }));

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background/50">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-8 min-h-screen">
          
          {/* Navigation */}
          <PageHeader
            title=""
            backUrl="/tags"
            backLabel="Tags"
            className="mb-6"
          />

          {/* Hero Header */}
          <header className="relative mb-12 overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm group">
            {/* Dynamic Background Gradient */}
            <div 
              className="absolute inset-0 opacity-10"
              style={gradientStyle}
            />
            
            <div className="relative p-8 sm:p-12 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
              {/* Tag Icon */}
              <div 
                className={cn(
                  "w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 transition-transform hover:rotate-0 duration-300",
                  !isHex ? rawColor : ""
                )}
                style={cssColorStyle}
              >
                <Hash className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>

              {/* Tag Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                    {tag.name}
                  </h1>
                </div>
                <p className="text-muted-foreground text-lg max-w-2xl">
                  Collection of {books.length} books and {highlights.length} highlights
                </p>
              </div>

              {/* Stats & Actions */}
              <div className="flex flex-col gap-4 sm:ml-auto mt-4 sm:mt-0 items-end">
                <div className="flex gap-4">
                  <div className="px-5 py-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border shadow-sm text-center min-w-[100px]">
                    <div className="text-2xl font-bold text-foreground">{books.length}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Books</div>
                  </div>
                  <div className="px-5 py-3 rounded-xl bg-background/50 backdrop-blur-sm border border-border shadow-sm text-center min-w-[100px]">
                    <div className="text-2xl font-bold text-foreground">{highlights.length}</div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Highlights</div>
                  </div>
                </div>

                {/* Edit/Delete Actions */}
                <div className="flex gap-2 opacity-100 transition-opacity">
                   <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:bg-background/80 hover:text-foreground hover:shadow-sm transition-all bg-background/30 backdrop-blur-sm"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-error/80 hover:text-error hover:bg-error/10 transition-all bg-background/30 backdrop-blur-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Content Tabs */}
          <div className="mb-8 border-b border-border flex gap-6">
            <TabButton 
              isActive={activeTab === "books"} 
              onClick={() => setActiveTab("books")}
              count={books.length}
            >
              Books
            </TabButton>
            <TabButton 
              isActive={activeTab === "highlights"} 
              onClick={() => setActiveTab("highlights")}
              count={highlights.length}
            >
              Highlights
            </TabButton>
          </div>

          {/* Main Content Area */}
          <div className="min-h-[400px]">
            {activeTab === "books" && (
              <>
                {books.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-6">
                    {mappedBooks.map((book) => (
                      <div key={book.id} className="h-full">
                        <BookCard 
                          book={book} 
                          onTagClick={(e: any) => {
                            e.preventDefault(); e.stopPropagation();
                          }}
                          onPinClick={(e: any) => {
                             e.preventDefault(); e.stopPropagation();
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState tagColor={rawColor} type="books" />
                )}
              </>
            )}

            {activeTab === "highlights" && (
              <>
                {highlights.length > 0 ? (
                  <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                    {mappedHighlights.map((highlight) => (
                      <HighlightCard 
                        key={highlight.id} 
                        highlight={highlight as any} 
                        accentColor={isHex ? rawColor : undefined} // Only pass if hex, otherwise card falls back to default
                        showBookInfo={true}
                        className="break-inside-avoid mb-6"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState tagColor={rawColor} type="highlights" />
                )}
              </>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {isModalOpen && (
          <TagModal
            tag={tag}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveTag}
            isSaving={updateMutation.isPending}
          />
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl border border-border">
              <h3 className="text-lg font-serif font-bold mb-2">Delete Tag?</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Are you sure you want to delete <span className="font-medium text-foreground">"{tag.name}"</span>? 
                This will remove the tag from all books and highlights.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setDeleteConfirm(false)} 
                  className="px-4 py-2 text-sm font-medium rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-full bg-error text-white hover:bg-error/90 disabled:opacity-50 transition-colors"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

function EmptyState({ tagColor, type }: { tagColor: string, type: "books" | "highlights" }) {
  const isHex = tagColor.startsWith("#");
  
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-card/30 rounded-3xl border border-dashed border-border">
      <div 
        className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 opacity-50",
          !isHex ? tagColor : ""
        )}
        style={isHex ? { backgroundColor: `${tagColor}20`, color: tagColor } : undefined}
      >
        {type === "books" ? <Library className="w-8 h-8" /> : <Quote className="w-8 h-8" />}
      </div>
      <h3 className="text-xl font-semibold mb-2">No {type} found</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        This tag hasn't been added to any {type} yet. Go to your library to start organizing.
      </p>
      <Link href="/library" className="btn btn-primary">
        Browse Library
      </Link>
    </div>
  );
}
