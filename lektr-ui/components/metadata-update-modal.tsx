"use client";

import { useState } from "react";
import { type PendingMetadataUpdate, updateBookMetadata } from "@/lib/api";

interface MetadataUpdateModalProps {
  updates: PendingMetadataUpdate[];
  onClose: () => void;
  onComplete: () => void;
}

export function MetadataUpdateModal({ updates, onClose, onComplete }: MetadataUpdateModalProps) {
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const current = updates[currentIndex];
  const isLastUpdate = currentIndex === updates.length - 1;

  const handleUpdate = async () => {
    if (!current) return;
    
    setProcessing(true);
    try {
      await updateBookMetadata(current.bookId, current.available);
    } catch (e) {
      console.error("Failed to update metadata:", e);
    }
    setProcessing(false);

    if (isLastUpdate) {
      onComplete();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    if (isLastUpdate) {
      onComplete();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Update Metadata?</h2>
          <span className="text-sm text-muted-foreground">{currentIndex + 1} of {updates.length}</span>
        </div>

        <p className="text-lg font-medium mb-4">{current.bookTitle}</p>

        {current.available.coverImageUrl && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">New cover available:</p>
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Current</p>
                {current.current.coverImageUrl ? (
                  <img src={current.current.coverImageUrl} alt="Current cover" className="w-24 h-36 object-cover rounded-lg" />
                ) : (
                  <div className="w-24 h-36 bg-muted rounded-lg flex items-center justify-center">📚</div>
                )}
              </div>
              <div className="flex items-center">→</div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Available</p>
                <img src={current.available.coverImageUrl} alt="New cover" className="w-24 h-36 object-cover rounded-lg border-2 border-primary" />
              </div>
            </div>
          </div>
        )}

        {current.available.description && !current.current.description && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Description available:</p>
            <p className="text-sm line-clamp-3">{current.available.description}</p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-muted-foreground hover:text-foreground" disabled={processing}>Skip All</button>
          <div className="flex-1" />
          <button onClick={handleSkip} className="btn btn-secondary" disabled={processing}>Skip</button>
          <button onClick={handleUpdate} disabled={processing} className="btn btn-primary">
            {processing ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
