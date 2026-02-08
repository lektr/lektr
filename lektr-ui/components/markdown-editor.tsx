"use client";

import { useState, useRef, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  minHeight?: string;
  /** Whether to show the cloze button in toolbar. Default: true */
  showClozeButton?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your note... (supports **bold**, *italic*, - lists)",
  rows = 4,
  autoFocus = false,
  minHeight,
  showClozeButton = true,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Insert text at cursor, wrapping selection if present
  const insertFormat = useCallback(
    (prefix: string, suffix: string = prefix) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);

      const newText =
        value.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        value.substring(end);

      onChange(newText);

      // Restore cursor position after React update
      setTimeout(() => {
        textarea.focus();
        const newCursor = start + prefix.length + selectedText.length + suffix.length;
        textarea.setSelectionRange(
          selectedText ? newCursor : start + prefix.length,
          selectedText ? newCursor : start + prefix.length
        );
      }, 0);
    },
    [value, onChange]
  );

  const insertAtLineStart = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      // Find start of current line
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;

      const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);
      onChange(newText);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    },
    [value, onChange]
  );

  const baseButtons = [
    { label: "B", title: "Bold (Ctrl+B)", action: () => insertFormat("**"), className: "font-bold" },
    { label: "I", title: "Italic (Ctrl+I)", action: () => insertFormat("*"), className: "italic" },
    { label: "S̶", title: "Strikethrough", action: () => insertFormat("~~"), className: "" },
    { label: "{}", title: "Code", action: () => insertFormat("`"), className: "font-mono text-xs" },
    { label: "🔗", title: "Link", action: () => insertFormat("[", "](url)"), className: "" },
    { label: "•", title: "List item", action: () => insertAtLineStart("- "), className: "" },
  ];

  const toolbarButtons = showClozeButton
    ? [...baseButtons, { label: "[...]", title: "Cloze Deletion (Ctrl+Shift+C)", action: () => insertFormat("{{c1::", "}}"), className: "font-mono text-xs bg-primary/10 text-primary" }]
    : baseButtons;

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.shiftKey && e.key === "c") {
        e.preventDefault();
        insertFormat("{{c1::", "}}");
      } else if (e.key === "b") {
        e.preventDefault();
        insertFormat("**");
      } else if (e.key === "i") {
        e.preventDefault();
        insertFormat("*");
      }
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-muted/50 border-b border-border">
        {toolbarButtons.map((btn) => (
          <button
            key={btn.title}
            type="button"
            title={btn.title}
            onClick={btn.action}
            className={`min-w-[28px] h-7 px-1 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground text-sm ${btn.className}`}
          >
            {btn.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            showPreview
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {/* Editor or Preview */}
      {showPreview ? (
        <div className="p-3 prose prose-sm max-w-none" style={{ minHeight: minHeight || "100px" }}>
          {value ? (
            <MarkdownPreview content={value} />
          ) : (
            <p className="text-muted-foreground italic">Nothing to preview</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          autoFocus={autoFocus}
          className="w-full resize-none px-3 py-2 border-0 focus:ring-0 bg-transparent"
          style={{ minHeight: minHeight || "auto" }}
        />
      )}
    </div>
  );
}

// Simple inline preview (for the editor preview tab)
function MarkdownPreview({ content }: { content: string }) {
  // Basic markdown rendering without importing react-markdown (for preview only)
  const lines = content.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // Bold
        let processed = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        // Italic
        processed = processed.replace(/\*(.+?)\*/g, "<em>$1</em>");
        // Strikethrough
        processed = processed.replace(/~~(.+?)~~/g, "<del>$1</del>");
        // Code
        processed = processed.replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>');
        // List items
        if (processed.startsWith("- ")) {
          processed = "• " + processed.substring(2);
        }

        return (
          <p
            key={i}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processed || "&nbsp;") }}
            className={line.startsWith("- ") ? "pl-2" : ""}
          />
        );
      })}
    </div>
  );
}
