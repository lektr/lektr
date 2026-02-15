"use client";

import { useState, useEffect } from "react";
import { Tag as TagType } from "@/lib/api";
import { TagColorPicker } from "./tag-color-picker";
import { Modal } from "./modal";

interface TagModalProps {
  tag?: TagType | null; // If provided, we're editing
  onClose: () => void;
  onSave: (name: string, color: string | null) => Promise<void>;
  isSaving: boolean;
}

export function TagModal({ tag, onClose, onSave, isSaving }: TagModalProps) {
  const [name, setName] = useState(tag?.name || "");
  const [color, setColor] = useState<string | null>(tag?.color || null);

  // Reset when tag prop changes
  useEffect(() => {
    setName(tag?.name || "");
    setColor(tag?.color || null);
  }, [tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSave(name.trim(), color);
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-serif font-bold mb-4">
        {tag ? "Edit Tag" : "Create New Tag"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="tag-name" className="block text-sm font-medium mb-2">
            Name
          </label>
          <input
            id="tag-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. History, To Read, Favorite"
            className="w-full rounded-full bg-muted/50 border-none px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Color
          </label>
          <TagColorPicker
            selectedColor={color}
            onSelect={setColor}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="btn btn-secondary cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="btn btn-primary cursor-pointer"
          >
            {isSaving ? "Saving..." : tag ? "Save Changes" : "Create Tag"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
