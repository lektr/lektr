"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Download, FileText, FileSpreadsheet, ExternalLink, Check, Loader2 } from "lucide-react";
import { getExportProviders, triggerExport, type ExportProvider } from "@/lib/api";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookIds?: string[]; // If empty, export all books
  bookTitle?: string; // For display purposes when exporting single book
}

export function ExportModal({ isOpen, onClose, bookIds, bookTitle }: ExportModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [notionToken, setNotionToken] = useState("");
  const [notionPageId, setNotionPageId] = useState("");
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const { data: providersData, isLoading } = useQuery({
    queryKey: ["exportProviders"],
    queryFn: getExportProviders,
    enabled: isOpen,
  });

  const exportMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const config: Record<string, unknown> = {};
      if (providerId === "notion") {
        config.notionToken = notionToken;
        config.notionPageId = notionPageId;
      }

      return triggerExport(providerId, {
        bookIds,
        includeNotes,
        config,
      });
    },
    onSuccess: (result) => {
      if (result instanceof Blob) {
        // Download the file
        const url = URL.createObjectURL(result);
        const a = document.createElement("a");
        a.href = url;
        a.download = getFilename(selectedProvider || "export");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportSuccess(true);
        setExportMessage("File downloaded successfully!");
      } else {
        setExportSuccess(true);
        setExportMessage(result.message || "Export completed!");
      }
    },
    onError: (error: Error) => {
      setExportMessage(error.message);
    },
  });

  const getFilename = (providerId: string): string => {
    const base = bookTitle ? bookTitle.replace(/[^a-zA-Z0-9]/g, "_") : "lektr-export";
    switch (providerId) {
      case "markdown":
        return `${base}.md`;
      case "obsidian":
        return `${base}-obsidian.md`;
      case "readwise":
        return `${base}.csv`;
      default:
        return base;
    }
  };

  const getProviderIcon = (provider: ExportProvider) => {
    switch (provider.id) {
      case "markdown":
        return <FileText className="w-5 h-5" />;
      case "obsidian":
        return <span className="text-lg">💎</span>;
      case "readwise":
        return <FileSpreadsheet className="w-5 h-5" />;
      case "notion":
        return <span className="text-lg">📓</span>;
      default:
        return <Download className="w-5 h-5" />;
    }
  };

  const handleExport = () => {
    if (!selectedProvider) return;
    setExportSuccess(false);
    setExportMessage("");
    exportMutation.mutate(selectedProvider);
  };

  const selectedProviderData = providersData?.providers.find((p) => p.id === selectedProvider);

  useEffect(() => {
    if (!isOpen) {
      setSelectedProvider(null);
      setExportSuccess(false);
      setExportMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-card rounded-xl border border-border/50 p-6 max-w-lg w-full shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif font-bold text-foreground">
            Export Highlights
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {bookTitle && (
          <p className="text-sm text-muted-foreground mb-4">
            Exporting: <span className="font-medium text-foreground">{bookTitle}</span>
          </p>
        )}

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Provider Selection */}
            <div className="space-y-2 mb-6">
              <label className="text-sm font-medium text-foreground">Export Format</label>
              <div className="grid grid-cols-2 gap-3">
                {providersData?.providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedProvider === provider.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-primary">{getProviderIcon(provider)}</span>
                    <div className="text-left">
                      <p className="font-medium text-sm">{provider.name}</p>
                      {provider.requiresAuth && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Requires setup
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-foreground">Include notes</span>
              </label>
            </div>

            {/* Notion Config */}
            {selectedProvider === "notion" && (
              <div className="space-y-4 mb-6 p-4 bg-muted/30 rounded-xl">
                <p className="text-xs text-muted-foreground">
                  Create an{" "}
                  <a
                    href="https://www.notion.so/my-integrations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Internal Integration
                  </a>{" "}
                  and share your target page with it.
                </p>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Integration Token
                  </label>
                  <input
                    type="password"
                    value={notionToken}
                    onChange={(e) => setNotionToken(e.target.value)}
                    placeholder="secret_..."
                    className="w-full bg-muted/50 border-none rounded-full px-4 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    Page ID
                  </label>
                  <input
                    type="text"
                    value={notionPageId}
                    onChange={(e) => setNotionPageId(e.target.value)}
                    placeholder="abc123..."
                    className="w-full bg-muted/50 border-none rounded-full px-4 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Status Message */}
            {exportMessage && (
              <div
                className={`p-3 rounded-xl mb-4 text-sm ${
                  exportSuccess
                    ? "bg-success/10 text-success"
                    : "bg-error/10 text-error"
                }`}
              >
                {exportSuccess && <Check className="w-4 h-4 inline mr-2" />}
                {exportMessage}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-all duration-200 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!selectedProvider || exportMutation.isPending}
                className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {exportMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
