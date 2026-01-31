"use client";

import { useState } from "react";
import { MarkdownEditor } from "./markdown-editor";

interface EditHighlightModalProps {
  highlight: { id: string; content: string; note: string | null };
  onClose: () => void;
  onSave: (data: { content: string; note: string | null }) => Promise<void>;
  isSaving: boolean;
}

export function EditHighlightModal({ highlight, onClose, onSave, isSaving }: EditHighlightModalProps) {
  const [content, setContent] = useState(highlight.content);
  const [note, setNote] = useState(highlight.note || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ 
      content: content.trim(), 
      note: note.trim() || null 
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 max-w-lg w-full shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Edit Highlight</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-content" className="block text-sm font-medium mb-2">
              Highlight Text
            </label>
            <textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={5}
              className="w-full resize-none"
              style={{ fontFamily: "var(--font-literata), Georgia, serif" }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Fix OCR errors, typos, or improve clarity
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Your Note <span className="text-muted-foreground font-normal">(supports markdown)</span>
            </label>
            <MarkdownEditor
              value={note}
              onChange={setNote}
              placeholder="Add your thoughts, connections, or clarifications..."
              rows={4}
            />
          </div>
          
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !content.trim()}
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
