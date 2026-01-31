"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const { data: authData, isLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: getCurrentUser,
  });

  const user = authData?.user;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsSearchOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all">
      <div className="container flex items-center h-[72px] gap-4">
        {/* Brand */}
        <div className="flex-1">
          <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity">
            Lektr
          </Link>
        </div>

        {/* Centered Navigation */}
        <div className="hidden md:flex flex-1 justify-center">
          {user && (
            <div className="flex items-center gap-1 p-1 rounded-full border border-border/50 bg-background/50 shadow-sm">
              <NavLink href="/library">Library</NavLink>
              <NavLink href="/tags">Tags</NavLink>
              <NavLink href="/sync">Sync</NavLink>
              <NavLink href="/review">Review</NavLink>
              {user.role === "admin" && (
                <NavLink href="/admin/settings">Admin</NavLink>
              )}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex-1 flex justify-end items-center gap-4">
          {!isLoading && (
            <>
              {user ? (
                <>
                  {/* Search Trigger */}
                  <div className={`relative flex items-center transition-all ${isSearchOpen ? 'w-64' : 'w-auto'}`}>
                    {isSearchOpen ? (
                      <form onSubmit={handleSearch} className="w-full relative animate-fade-in">
                        <input
                          autoFocus
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onBlur={() => !searchQuery && setIsSearchOpen(false)}
                          placeholder="Search books..."
                          className="w-full !h-9 !min-h-0 !py-0 !pl-10 !pr-4 text-sm bg-muted/50 border-none rounded-full focus:ring-1 focus:ring-primary/20 leading-9"
                        />
                        <svg
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsSearchOpen(true)}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/50 rounded-full cursor-pointer"
                        title="Search"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Theme Toggle */}
                  <ThemeToggle />

                  <div className="h-4 w-px bg-border/60 mx-1" />
                  
                  <UserMenu />
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Sign In
                  </Link>
                  <Link href="/register" className="px-5 py-2 bg-foreground text-background text-sm font-medium rounded-full hover:opacity-90 transition-opacity shadow-sm">
                    Get Started
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
