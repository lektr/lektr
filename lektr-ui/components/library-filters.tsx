"use client";

import { MultiTagSelector } from "@/components/multi-tag-selector";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LibraryFilterState {
  sources: string[];
  status: string[];
  tags: string[];
}

interface LibraryFiltersProps {
  filters: LibraryFilterState;
  onChange: (filters: LibraryFilterState) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClear: () => void;
  resultCount: number;
}

const SOURCES = [
  { id: "kindle", label: "Kindle Import" },
  { id: "web", label: "Web Article" },
  { id: "koreader", label: "KOReader" },
  { id: "readwise", label: "Readwise" },
  { id: "manual", label: "Manual Entry" },
];

const STATUSES = [
  { id: "pinned", label: "Pinned" },
  { id: "has_highlights", label: "Has Highlights" },
  { id: "no_highlights", label: "No Highlights" },
];

export function LibraryFilters({
  filters,
  onChange,
  isOpen,
  onToggle,
  onClear,
  resultCount
}: LibraryFiltersProps) {

  const activeCount = filters.sources.length + filters.status.length + filters.tags.length;

  const toggleSource = (sourceId: string) => {
    const next = filters.sources.includes(sourceId)
      ? filters.sources.filter(s => s !== sourceId)
      : [...filters.sources, sourceId];
    onChange({ ...filters, sources: next });
  };

  const toggleStatus = (statusId: string) => {
    const next = filters.status.includes(statusId)
      ? filters.status.filter(s => s !== statusId)
      : [...filters.status, statusId];
    onChange({ ...filters, status: next });
  };

  return (
    <div className="relative z-10">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all shadow-sm border",
            isOpen || activeCount > 0
              ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20"
              : "bg-card hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="flex items-center justify-center bg-background text-foreground text-[10px] font-bold w-5 h-5 rounded-full ml-1 border border-border shadow-sm">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Backdrop for mobile closing on click outside (transparent) */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={onToggle}
          />

          <div className="absolute top-full left-0 mt-2 w-[90vw] sm:w-[600px] p-5 rounded-2xl bg-card/95 backdrop-blur-md border border-border/50 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Source Column */}
              <div className="space-y-3">
                <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
                  Source
                </h3>
                <div className="space-y-2">
                  {SOURCES.map(source => (
                    <label key={source.id} className="flex items-center gap-2.5 text-sm cursor-pointer group select-none">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.sources.includes(source.id)}
                          onChange={() => toggleSource(source.id)}
                          className="peer appearance-none w-4 h-4 rounded border border-border checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                        />
                         <svg
                          className="absolute w-3 h-3 text-primary-foreground pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity left-0.5 top-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="group-hover:text-foreground text-muted-foreground transition-colors">{source.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Column */}
              <div className="space-y-3">
                <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
                  Status
                </h3>
                <div className="space-y-2">
                  {STATUSES.map(status => (
                    <label key={status.id} className="flex items-center gap-2.5 text-sm cursor-pointer group select-none">
                       <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status.id)}
                          onChange={() => toggleStatus(status.id)}
                          className="peer appearance-none w-4 h-4 rounded border border-border checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                        />
                         <svg
                          className="absolute w-3 h-3 text-primary-foreground pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity left-0.5 top-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="group-hover:text-foreground text-muted-foreground transition-colors">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tags Column */}
              <div className="space-y-3 sm:col-span-1">
                <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
                  Tags
                </h3>
                <div className="bg-muted/30 p-2 rounded-xl border border-border/50">
                  <MultiTagSelector
                    selectedTagIds={filters.tags}
                    onChange={(tags) => onChange({ ...filters, tags })}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-border/50 flex justify-between items-center text-xs">
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-muted-foreground">
                   <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                   <span>Found <span className="font-medium text-foreground">{resultCount}</span> matching books</span>
                 </div>

                 {activeCount > 0 && (
                   <button
                     onClick={onClear}
                     className="font-medium text-muted-foreground hover:text-error transition-colors underline decoration-dotted underline-offset-2 hover:decoration-solid"
                   >
                     Clear all
                   </button>
                 )}
               </div>

               <button
                 onClick={onToggle}
                 className="flex items-center gap-1.5 hover:text-foreground transition-colors px-2 py-1 hover:bg-muted rounded text-muted-foreground"
               >
                 Close <X className="w-3 h-3" />
               </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
