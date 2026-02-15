"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Search, MoreHorizontal, Edit2, Trash2, Tag as TagIcon, ArrowUpDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getTags, createTag, updateTag, deleteTag, type Tag } from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { TagModal } from "@/components/tag-modal";
import { SearchInput } from "@/components/search-input";
import { TagBadge } from "@/components/tag-badge";

type SortOption = "name" | "count" | "date";

export default function TagsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [sortDesc, setSortDesc] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Tag | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
  });

  const createMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string | null }) => 
      createTag(name, color || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, color }: { id: string; name: string; color: string | null }) => 
      updateTag(id, { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setIsModalOpen(false);
      setEditingTag(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setDeleteConfirm(null);
    },
  });

  // Calculate stats for each tag (simulated for now as API returns minimal tag info)
  // In a real app we'd want the API to return counts.
  // For now we'll assume the API returns extended tag info or update the API later.
  // Based on current API types: Tag interface has id, name, color, createdAt. 
  // We might not have counts yet without API changes.
  
  const filteredTags = useMemo(() => {
    if (!data?.tags) return [];
    
    let result = [...data.tags];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(tag => tag.name.toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "date":
          comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          break;
        case "count": {
          const totalA = (a.bookCount || 0) + (a.highlightCount || 0);
          const totalB = (b.bookCount || 0) + (b.highlightCount || 0);
          comparison = totalA - totalB;
          break;
        }
      }
      return sortDesc ? -comparison : comparison;
    });

    return result;
  }, [data?.tags, searchQuery, sortBy, sortDesc]);

  const handleSaveTag = async (name: string, color: string | null) => {
    if (editingTag) {
      await updateMutation.mutateAsync({ id: editingTag.id, name, color });
    } else {
      await createMutation.mutateAsync({ name, color });
    }
  };

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(option);
      setSortDesc(false);
    }
  };

  return (
    <AuthGuard>
      <div className="container py-8 min-h-screen">
        <PageHeader
          title="Tags"
          description={`${filteredTags.length} ${filteredTags.length === 1 ? 'tag' : 'tags'} in your library`}
          actions={
            <button
               onClick={() => {
                 setEditingTag(null);
                 setIsModalOpen(true);
               }}
               className="btn btn-primary h-10"
             >
               <Plus className="w-4 h-4 mr-2" />
               Create Tag
             </button>
          }
        >
          {/* Toolbar */}
          <div className="max-w-md">
            <SearchInput
              placeholder="Filter tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </PageHeader>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 w-full bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="text-center py-24 bg-muted/20 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
            <div className="w-16 h-16 mb-4 bg-muted rounded-full flex items-center justify-center opacity-50">
              <TagIcon className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium text-foreground">No tags found</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto mb-6">
              {searchQuery ? "Try checking your spelling or clear the filter." : "Create your first tag to start organizing your library."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-secondary"
              >
                Create Tag
              </button>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                      <th className="p-4 font-medium text-sm text-muted-foreground w-1/3">
                      <button 
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 hover:text-foreground transition-colors font-medium cursor-pointer"
                      >
                        Name
                        <ArrowUpDown className={`w-3 h-3 ${sortBy === "name" ? "opacity-100" : "opacity-40"}`} />
                      </button>
                    </th>
                    <th className="p-4 font-medium text-sm text-muted-foreground">
                      Color
                    </th>
                    <th className="p-4 font-medium text-sm text-muted-foreground">
                       <button 
                        onClick={() => handleSort("date")}
                        className="flex items-center gap-1 hover:text-foreground transition-colors font-medium cursor-pointer"
                      >
                        Created
                        <ArrowUpDown className={`w-3 h-3 ${sortBy === "date" ? "opacity-100" : "opacity-40"}`} />
                      </button>
                    </th>
                    <th className="p-4 font-medium text-sm text-muted-foreground">
                      Stats
                    </th>
                    <th className="p-4 text-right font-medium text-sm text-muted-foreground w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredTags.map((tag) => (
                    <tr key={tag.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Link href={`/tags/${tag.id}`} className="hover:opacity-80 transition-opacity">
                            <TagBadge name={tag.name} color={tag.color} />
                          </Link>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full ${tag.color?.startsWith("#") ? "" : (tag.color || "bg-muted border border-border")}`} style={tag.color?.startsWith("#") ? { backgroundColor: tag.color } : undefined} />
                          <span className="text-xs text-muted-foreground font-mono">
                             {tag.color ? (tag.color.startsWith("#") ? tag.color : tag.color.split(" ")[0].replace("bg-", "")) : "default"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {tag.createdAt ? new Date(tag.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        <div className="flex gap-3">
                          <span title="Books" className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                            <span className="text-xs font-semibold">{tag.bookCount || 0}</span>
                            <span className="text-[10px] uppercase tracking-wider opacity-70">Books</span>
                          </span>
                          <span title="Highlights" className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                            <span className="text-xs font-semibold">{tag.highlightCount || 0}</span>
                            <span className="text-[10px] uppercase tracking-wider opacity-70">Highlights</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingTag(tag);
                              setIsModalOpen(true);
                            }}
                            className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(tag)}
                            className="p-2 hover:bg-error/10 rounded-full text-muted-foreground hover:text-error transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <TagModal
            tag={editingTag}
            onClose={() => {
              setIsModalOpen(false);
              setEditingTag(null);
            }}
            onSave={handleSaveTag}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl border border-border">
              <h3 className="text-lg font-serif font-bold mb-2">Delete Tag?</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Are you sure you want to delete <span className="font-medium text-foreground">"{deleteConfirm.name}"</span>? 
                This will remove the tag from all books and highlights.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setDeleteConfirm(null)} 
                  className="px-4 py-2 text-sm font-medium rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteConfirm.id)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium rounded-full bg-error text-white hover:bg-error/90 disabled:opacity-50 transition-colors"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
