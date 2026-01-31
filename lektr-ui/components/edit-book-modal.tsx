"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { refreshBookCover } from "@/lib/api";

interface EditBookModalProps {
  book: { id: string; title: string; author: string | null };
  onClose: () => void;
  onSave: (data: { title: string; author: string }) => Promise<void>;
  onCoverRefreshed?: () => void;
  isSaving: boolean;
}

export function EditBookModal({ book, onClose, onSave, onCoverRefreshed, isSaving }: EditBookModalProps) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author || "");
  const [isRefreshingCover, setIsRefreshingCover] = useState(false);
  const [coverMessage, setCoverMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ title: title.trim(), author: author.trim() });
  };

  const handleRefreshCover = async () => {
    setIsRefreshingCover(true);
    setCoverMessage(null);
    
    try {
      const result = await refreshBookCover(book.id);
      if (result.success) {
        setCoverMessage({ type: "success", text: result.message });
        onCoverRefreshed?.();
      } else {
        setCoverMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setCoverMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to refresh cover" 
      });
    } finally {
      setIsRefreshingCover(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl animate-slide-up">
        <h2 className="text-xl font-semibold mb-4">Edit Book</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium mb-2">
              Title
            </label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full"
              autoFocus
            />
          </div>
          
          <div>
            <label htmlFor="edit-author" className="block text-sm font-medium mb-2">
              Author
            </label>
            <input
              id="edit-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Unknown author"
              className="w-full"
            />
          </div>

          {/* Refresh Cover Section */}
          <div className="border-t border-border/50 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Book Cover</p>
                <p className="text-xs text-muted-foreground">Re-fetch cover from online sources</p>
              </div>
              <button
                type="button"
                onClick={handleRefreshCover}
                disabled={isRefreshingCover || isSaving}
                className={`btn btn-secondary flex items-center gap-2 ${
                  isRefreshingCover ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingCover ? "animate-spin" : ""}`} />
                {isRefreshingCover ? "Fetching..." : "Refresh Cover"}
              </button>
            </div>
            
            {coverMessage && (
              <p className={`text-sm mt-2 ${
                coverMessage.type === "success" ? "text-success" : "text-error"
              }`}>
                {coverMessage.type === "success" ? "✓" : "✗"} {coverMessage.text}
              </p>
            )}
          </div>
          
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isRefreshingCover}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isRefreshingCover || !title.trim()}
              className="btn btn-primary"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

