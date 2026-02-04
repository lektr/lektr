"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Library, GraduationCap, Settings, Hash } from "lucide-react";
import { toast } from "sonner";
import { getDecks, deleteDeck, type Deck } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { AuthGuard } from "@/components/auth-guard";
import { CreateDeckModal } from "@/components/create-deck-modal";

export default function DecksPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["decks"],
    queryFn: getDecks,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      toast.success("Deck deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete deck", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure? This will delete the deck and all its cards.")) {
      deleteMutation.mutate(id);
    }
  };

  const decks = data?.decks ?? [];

  return (
    <AuthGuard>
      <div className="container py-8 max-w-[1200px] mx-auto min-h-screen">
        <PageHeader
          title="Flashcard Decks"
          description="Manage your decks and study sessions"
        >
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Deck
          </button>
        </PageHeader>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-48 animate-pulse p-6">
                <div className="skeleton h-6 w-3/4 mb-4" />
                <div className="skeleton h-4 w-1/2 mb-2" />
                <div className="skeleton h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Library className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No decks yet</h3>
            <p className="text-muted-foreground mb-6">Create your first deck to start studying.</p>
            <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary">
              Create Deck
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 animate-fade-in">
            {decks.map((deck) => (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                className="card group hover:border-primary/50 transition-all p-0 flex flex-col h-full overflow-hidden"
              >
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {deck.type === "smart" ? <Hash className="w-5 h-5" /> : <Library className="w-5 h-5" />}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDelete(e, deck.id)}
                        className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-full transition-colors"
                        title="Delete Deck"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                    {deck.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {deck.description || "No description"}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-border" />
                      <span>{deck.cardCount || 0} cards</span>
                    </div>
                    {(deck.dueCount || 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-warning font-medium">
                        <div className="w-2 h-2 rounded-full bg-warning" />
                        <span>{deck.dueCount} due</span>
                      </div>
                    )}
                  </div>

                  {deck.type === "smart" && deck.tags && deck.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {deck.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium"
                          style={{ color: tag.color || "inherit" }}
                        >
                          #{tag.name}
                        </span>
                      ))}
                      {deck.tags.length > 3 && (
                        <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                          +{deck.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {deck.type === "smart" ? "Smart Deck" : "Manual Deck"}
                  </span>
                  {(deck.dueCount || 0) > 0 ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/study/${deck.id}`);
                      }}
                      className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      Study Now
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                       All caught up
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        <CreateDeckModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      </div>
    </AuthGuard>
  );
}
