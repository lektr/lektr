"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, Smartphone, Globe, Rss, Upload, FileText, CheckCircle2, ArrowRight, Loader2, PenLine } from "lucide-react";
import { importHighlights, getCurrentUser, addManualHighlight, type PendingMetadataUpdate, type ImportResponse } from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { PageHeader } from "@/components/page-header";
import { MetadataUpdateModal } from "@/components/metadata-update-modal";
import { BookSelector, type SelectedBook } from "@/components/book-selector";
import { MarkdownEditor } from "@/components/markdown-editor";
import { KindleIntegrationCard } from "@/components/kindle-integration-card";

type SourceType = "koreader" | "kindle" | "manual" | "web" | "rss" | "readwise" | "lektr";

const sourceOptions = [
  { 
    id: "koreader" as SourceType, 
    name: "KOReader", 
    description: "Import from JSON/Lua history", 
    icon: BookOpen, 
    enabled: true 
  },
  { 
    id: "kindle" as SourceType, 
    name: "Kindle", 
    description: "My Clippings.txt file", 
    icon: Smartphone, 
    enabled: true 
  },
  { 
    id: "readwise" as SourceType, 
    name: "Readwise", 
    description: "CSV Export", 
    icon: FileText, 
    enabled: true 
  },
  { 
    id: "lektr" as SourceType, 
    name: "Lektr", 
    description: "Re-import exported .md", 
    icon: BookOpen, 
    enabled: true 
  },
  { 
    id: "manual" as SourceType, 
    name: "Manual Entry", 
    description: "Add a quote by hand", 
    icon: PenLine, 
    enabled: true 
  },
  { 
    id: "web" as SourceType, 
    name: "Web Article", 
    description: "Coming Soon", 
    icon: Globe, 
    enabled: false 
  },
  { 
    id: "rss" as SourceType, 
    name: "RSS Feed", 
    description: "Coming Soon", 
    icon: Rss, 
    enabled: false 
  },
];

export default function SyncPage() {
  const [selectedSource, setSelectedSource] = useState<SourceType>("koreader");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<PendingMetadataUpdate[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  const queryClient = useQueryClient();

  const { data: authData } = useQuery({
    queryKey: ["auth"],
    queryFn: getCurrentUser,
  });

  const detectSource = (file: File) => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.json') || name.endsWith('.lua')) {
      setSelectedSource('koreader');
      toast.info("Detected KOReader format", { duration: 2000 });
    } else if (name.endsWith('.txt') || name.includes('clippings')) {
      setSelectedSource('kindle');
      toast.info("Detected Kindle format", { duration: 2000 });
    } else if (name.endsWith('.csv')) {
      setSelectedSource('readwise');
      toast.info("Detected Readwise CSV", { duration: 2000 });
    } else if (name.endsWith('.md')) {
      setSelectedSource('lektr');
      toast.info("Detected Lektr export", { duration: 2000 });
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      if (!authData?.user) throw new Error("Please sign in to import");
      return importHighlights(file, selectedSource);
    },
    onSuccess: (data) => {
      setFile(null);
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["books"] });
      
      if (data.pendingUpdates && data.pendingUpdates.length > 0) {
        setPendingUpdates(data.pendingUpdates);
        setShowUpdateModal(true);
      }
      toast.success("Import successful!");
    },
    onError: (error) => {
      toast.error("Import failed", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    },
  });

  // Manual Entry State
  const [selectedBook, setSelectedBook] = useState<SelectedBook | null>(null);
  const [manualForm, setManualForm] = useState({
    content: "",
    note: "",
    chapter: "",
    page: "",
  });
  const [manualSuccess, setManualSuccess] = useState<{ bookId: string; bookCreated: boolean } | null>(null);

  const manualMutation = useMutation({
    mutationFn: async () => {
      if (!authData?.user) throw new Error("Please sign in to add highlights");
      if (!selectedBook) throw new Error("Please select or create a book");
      return addManualHighlight({
        title: selectedBook.title,
        author: selectedBook.author || undefined,
        bookId: selectedBook.isNew ? undefined : selectedBook.id,
        content: manualForm.content,
        note: manualForm.note || undefined,
        chapter: manualForm.chapter || undefined,
        page: manualForm.page ? parseInt(manualForm.page, 10) : undefined,
      });
    },
    onSuccess: (data) => {
      setManualSuccess({ bookId: data.bookId, bookCreated: data.bookCreated });
      // Invalidate both the books list and the specific book to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["book", data.bookId] });
      toast.success(data.bookCreated ? "Highlight added to new book!" : "Highlight added!");
    },
    onError: (error) => {
      toast.error("Failed to add highlight", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    manualMutation.mutate();
  };

  const handleManualReset = () => {
    setSelectedBook(null);
    setManualForm({ content: "", note: "", chapter: "", page: "" });
    setManualSuccess(null);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      detectSource(droppedFile);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      detectSource(selectedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      importMutation.mutate();
    }
  };

  const handleImportMore = () => {
    setImportResult(null);
    setFile(null);
  };

  // Calculate total books with highlights
  const booksWithHighlights = importResult?.bookBreakdown?.length || 0;

  return (
    <AuthGuard>
      <div className="container py-8 max-w-[1200px] mx-auto min-h-screen">
        <PageHeader
          title="Sync & Import"
          description="Keep your highlights in sync across all your reading devices and import from files."
        />
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Connected Sources Section */}
          <section className="animate-slide-up">
            <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider pl-1">
              Connected Sources
            </h2>
            <KindleIntegrationCard />
          </section>
          
          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm text-muted-foreground">or import from file</span>
            </div>
          </div>

          {/* Success State - Book Breakdown */}
          {importResult && importResult.highlightsImported > 0 ? (
            <section className="animate-fade-in">
              <div className="card p-8 bg-card border border-border/50 shadow-sm rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-success/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                
                <div className="relative z-10 text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4 ring-8 ring-success/5">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold mb-2">Import Complete!</h2>
                  <p className="text-muted-foreground">
                    Added <span className="font-semibold text-foreground">{importResult.highlightsImported}</span> highlights from <span className="font-semibold text-foreground">{booksWithHighlights}</span> {booksWithHighlights === 1 ? "book" : "books"}.
                  </p>
                </div>
                
                {importResult.bookBreakdown && importResult.bookBreakdown.length > 0 && (
                  <div className="bg-muted/20 dark:bg-white/5 rounded-xl p-1 mb-8 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <ul className="space-y-1">
                      {importResult.bookBreakdown.map((book) => (
                        <li key={book.bookId} className="flex items-center justify-between p-3 rounded-lg">
                          <span className="flex items-center gap-3 min-w-0">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold tabular-nums">
                              {book.highlightCount}
                            </span>
                            <span className="truncate font-medium text-sm">{book.title}</span>
                          </span>
                          <Link 
                            href={`/library/${book.bookId}`} 
                            target="_blank"
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary hover:text-white px-3 py-1.5 rounded-full transition-colors"
                          >
                            Review <ArrowRight className="w-3 h-3" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/library" className="btn btn-primary rounded-full px-8 h-12 text-base">
                    View Library
                  </Link>
                  <button onClick={handleImportMore} className="btn bg-muted/50 hover:bg-muted text-foreground rounded-full px-8 h-12 text-base">
                    Import More
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <>
              {importResult && importResult.highlightsImported === 0 ? (
                <section className="animate-fade-in mb-10">
                   <div className="card p-8 bg-card border border-border/50 shadow-sm rounded-2xl relative overflow-hidden">
                    <div className="relative z-10 text-center">
                      <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h2 className="text-2xl font-serif font-bold mb-2">No New Highlights</h2>
                      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                        We processed your file, but it seems all highlights have already been imported to your library. No duplicates were created.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/library" className="btn btn-primary rounded-full px-8 h-12 text-base">
                          View Library
                        </Link>
                        <button onClick={handleImportMore} className="btn bg-muted/50 hover:bg-muted text-foreground rounded-full px-8 h-12 text-base">
                          Import Different File
                        </button>
                      </div>
                    </div>
                   </div>
                </section>
              ) : (
                <div className="space-y-10">
                  {/* Source Selection */}
                  <section className="animate-slide-up">
                    <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider pl-1">
                      1. Select Source
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {sourceOptions.map((source) => {
                        const Icon = source.icon;
                        const isSelected = selectedSource === source.id;
                        return (
                          <button
                            key={source.id}
                            onClick={() => source.enabled && setSelectedSource(source.id)}
                            disabled={!source.enabled}
                            className={`group relative p-4 !rounded-2xl border text-left transition-all duration-200 min-h-[140px] flex flex-col justify-between items-start ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                                : source.enabled
                                ? "border-border hover:border-primary/50 hover:bg-muted/30 bg-card"
                                : "border-border/40 opacity-50 cursor-not-allowed bg-muted/20"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                            }`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className={`font-semibold text-sm mb-1 ${isSelected ? "text-primary" : "text-foreground"}`}>
                                {source.name}
                              </div>
                              <div className="text-xs text-muted-foreground leading-relaxed">
                                {source.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Step 2: File Upload OR Manual Entry Form */}
                  {selectedSource === "manual" ? (
                    /* Manual Entry Form */
                    manualSuccess ? (
                      <section className="animate-fade-in">
                        <div className="card p-8 bg-card border border-border/50 shadow-sm rounded-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-32 bg-success/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                          <div className="relative z-10 text-center">
                            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4 ring-8 ring-success/5">
                              <CheckCircle2 className="w-8 h-8 text-success" />
                            </div>
                            <h2 className="text-2xl font-serif font-bold mb-2">Highlight Added!</h2>
                            <p className="text-muted-foreground mb-6">
                              {manualSuccess.bookCreated 
                                ? "A new book has been created in your library."
                                : "The highlight was added to an existing book."}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                              <Link href={`/library/${manualSuccess.bookId}`} className="btn btn-primary rounded-full px-8 h-12 text-base">
                                View Book
                              </Link>
                              <button onClick={handleManualReset} className="btn bg-muted/50 hover:bg-muted text-foreground rounded-full px-8 h-12 text-base">
                                Add Another
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>
                    ) : (
                      <form onSubmit={handleManualSubmit} className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
                        <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider pl-1">
                          2. Enter Highlight Details
                        </h2>
                        
                        <div className="card p-6 sm:p-8 bg-card border border-border/50 rounded-2xl space-y-5">
                          {/* Book Selection */}
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Book <span className="text-error">*</span>
                            </label>
                            <BookSelector
                              value={selectedBook}
                              onChange={setSelectedBook}
                            />
                          </div>

                          <div>
                            <label htmlFor="manual-content" className="block text-sm font-medium text-foreground mb-2">
                              Highlight / Quote <span className="text-error">*</span>
                            </label>
                            <textarea
                              id="manual-content"
                              required
                              rows={4}
                              value={manualForm.content}
                              onChange={(e) => setManualForm(f => ({ ...f, content: e.target.value }))}
                              placeholder="Paste your highlight or quote here..."
                              className="w-full bg-muted/50 border-none rounded-2xl px-5 py-3 text-foreground placeholder:text-muted-foreground/60 resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Your Note <span className="text-muted-foreground text-xs">(optional)</span>
                            </label>
                            <MarkdownEditor
                              value={manualForm.note}
                              onChange={(value) => setManualForm(f => ({ ...f, note: value }))}
                              placeholder="Add your thoughts about this highlight..."
                              rows={3}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="manual-chapter" className="block text-sm font-medium text-foreground mb-2">
                                Chapter <span className="text-muted-foreground text-xs">(optional)</span>
                              </label>
                              <input
                                id="manual-chapter"
                                type="text"
                                value={manualForm.chapter}
                                onChange={(e) => setManualForm(f => ({ ...f, chapter: e.target.value }))}
                                placeholder="e.g. Chapter 3"
                                className="w-full bg-muted/50 border-none rounded-full px-5 py-3 text-foreground placeholder:text-muted-foreground/60"
                              />
                            </div>
                            <div>
                              <label htmlFor="manual-page" className="block text-sm font-medium text-foreground mb-2">
                                Page <span className="text-muted-foreground text-xs">(optional)</span>
                              </label>
                              <input
                                id="manual-page"
                                type="number"
                                value={manualForm.page}
                                onChange={(e) => setManualForm(f => ({ ...f, page: e.target.value }))}
                                placeholder="e.g. 42"
                                className="w-full bg-muted/50 border-none rounded-full px-5 py-3 text-foreground placeholder:text-muted-foreground/60"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-8 flex justify-end">
                          <button 
                            type="submit" 
                            disabled={!selectedBook || !manualForm.content || manualMutation.isPending} 
                            className="btn btn-primary rounded-full px-10 h-12 text-base font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none min-w-[200px]"
                          >
                            {manualMutation.isPending ? (
                              <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                 Adding...
                              </>
                            ) : (
                              "Add Highlight"
                            )}
                          </button>
                        </div>
                      </form>
                    )
                  ) : (
                  <form onSubmit={handleSubmit} className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
                    <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider pl-1">
                      2. Upload File
                    </h2>
                    
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => !file && document.getElementById("file-upload")?.click()}
                      className={`relative group border-2 border-dashed rounded-3xl p-10 sm:p-14 transition-all duration-300 text-center cursor-pointer ${
                        dragActive 
                          ? "border-primary bg-primary/5 scale-[1.01] shadow-lg" 
                          : file 
                            ? "border-success/50 bg-success/5" 
                            : "border-border/60 hover:border-primary/50 hover:bg-muted/30 bg-card"
                      }`}
                    >
                      <input 
                        id="file-upload"
                        type="file" 
                        accept=".json,.lua,.txt,.csv,.md" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                      
                      {file ? (
                        <div className="animate-fade-in relative z-10">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/15 text-success flex items-center justify-center ring-4 ring-success/5">
                            <FileText className="w-7 h-7" />
                          </div>
                          <h3 className="font-serif text-xl font-bold mb-1 text-foreground">{file.name}</h3>
                          <p className="text-sm text-muted-foreground mb-6 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                          
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); setFile(null); }} 
                            className="text-sm font-medium text-muted-foreground hover:text-error transition-colors underline decoration-dotted underline-offset-4"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="relative z-10">
                          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Upload className="w-7 h-7" />
                          </div>
                          <h3 className="font-serif text-lg font-semibold mb-2 text-foreground">
                            Drop your file here
                          </h3>
                          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                            or click to browse from your computer <br/>
                            <span className="text-xs opacity-70">Supports .json, .lua, .txt, .csv, .md</span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex justify-end">
                      <button 
                        type="submit" 
                        disabled={!file || importMutation.isPending} 
                        className="btn btn-primary rounded-full px-10 h-12 text-base font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none min-w-[200px]"
                      >
                        {importMutation.isPending ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          "Import Highlights"
                        )}
                      </button>
                    </div>
                  </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {showUpdateModal && pendingUpdates.length > 0 && (
        <MetadataUpdateModal
          updates={pendingUpdates}
          onClose={() => { setShowUpdateModal(false); setPendingUpdates([]); }}
          onComplete={() => { setShowUpdateModal(false); setPendingUpdates([]); }}
        />
      )}
    </AuthGuard>
  );
}
