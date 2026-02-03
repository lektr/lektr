"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  getDeletedHighlights,
  restoreHighlight,
  hardDeleteHighlight,
  type DeletedHighlight,
} from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { PageHeader } from "@/components/page-header";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Trash2, RotateCcw, AlertTriangle, Book, ChevronLeft } from "lucide-react";

export default function TrashPage() {
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["trash"],
    queryFn: getDeletedHighlights,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreHighlight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: hardDeleteHighlight,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      setConfirmDeleteId(null);
    },
  });

  const handleRestore = (highlightId: string) => {
    restoreMutation.mutate(highlightId);
  };

  const handleHardDelete = (highlightId: string) => {
    hardDeleteMutation.mutate(highlightId);
  };

  const formatDeletedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return <TrashSkeleton />;
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="max-w-md mx-auto text-center py-12">
          <p className="text-error mb-4">
            {error instanceof Error ? error.message : "Failed to load trash"}
          </p>
          <Link href="/library" className="btn btn-primary">
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  const highlights = data?.highlights || [];

  return (
    <AuthGuard>
      <div className="container py-8 min-h-screen">
        {/* Back Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-muted/50 -ml-3"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-medium text-sm">Library</span>
          </Link>
        </div>

        <PageHeader
          title="Trash"
          description={
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                🗑️ {highlights.length} {highlights.length === 1 ? "item" : "items"}
              </span>
            </div>
          }
        />

        {highlights.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
              <Trash2 className="w-10 h-10 opacity-30" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Trash is empty</h2>
            <p className="text-muted-foreground mb-6">
              Deleted highlights will appear here
            </p>
            <Link href="/library" className="btn btn-secondary">
              Back to Library
            </Link>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* Info banner */}
            <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <strong>Note:</strong> If you edit a highlight on your device after deleting it here, syncing will restore it automatically. This is by design.
              </div>
            </div>

            {/* Highlight list */}
            {highlights.map((h) => (
              <div
                key={h.id}
                className="p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Book className="w-4 h-4 text-muted-foreground" />
                      <Link
                        href={`/library/${h.bookId}`}
                        className="text-sm font-medium text-primary hover:underline truncate"
                      >
                        {h.bookTitle}
                      </Link>
                      {h.bookAuthor && (
                        <span className="text-sm text-muted-foreground truncate">
                          by {h.bookAuthor}
                        </span>
                      )}
                    </div>
                    <div className="text-sm line-clamp-3">
                      <MarkdownRenderer content={h.content} />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Deleted {formatDeletedDate(h.deletedAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleRestore(h.id)}
                      disabled={restoreMutation.isPending}
                      className="btn btn-secondary btn-sm gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                    {confirmDeleteId === h.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleHardDelete(h.id)}
                          disabled={hardDeleteMutation.isPending}
                          className="btn btn-error btn-sm text-xs cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="btn btn-ghost btn-sm text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(h.id)}
                        className="btn btn-ghost btn-sm text-error gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Forever
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

function TrashSkeleton() {
  return (
    <div className="container py-8">
      <div className="space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-6 w-24" />
        <div className="space-y-4 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
