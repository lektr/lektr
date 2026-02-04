"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getCurrentUser, logout } from "@/lib/api";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { Settings, LogOut } from "lucide-react";

export function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const { data: authData, isLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: getCurrentUser,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      window.location.href = "/login";
    },
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

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all">
      <div className="container flex items-center h-[72px] gap-4 relative">


        {/* Mobile Search Overlay - Full width on mobile when open */}
        {isSearchOpen && (
          <form
            onSubmit={handleSearch}
            className="md:hidden absolute inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center px-4 gap-2 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="relative flex-1">
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setIsSearchOpen(false)}
                placeholder="Search..."
                className="w-full h-10 pl-4 pr-10 text-base bg-muted/50 border-none rounded-full focus:ring-1 focus:ring-primary/20"
              />
            </div>
            {/* Toggle Button in Overlay (closes search) */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/50 rounded-full cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        )}

        {/* Mobile Menu Button - Left */}
        <div className="md:hidden z-10 shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>

            {/* Brand - Absolute Center on Mobile, Left on Desktop */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0 md:flex-1 md:flex md:justify-start z-20">
              <Link href="/" className="hover:opacity-80 transition-opacity flex items-center" onClick={closeMobileMenu}>
                <Logo />
              </Link>
            </div>

            {/* Centered Desktop Navigation */}
            <div className="hidden md:flex flex-1 justify-center">
              {user && (
                <div className="flex items-center gap-1 p-1 rounded-full border border-border/50 bg-background/50 shadow-sm">
                  <NavLink href="/library">Library</NavLink>
                  <NavLink href="/decks">Decks</NavLink>
                  <NavLink href="/tags">Tags</NavLink>
                  <NavLink href="/sync">Sync</NavLink>
                  {user.role === "admin" && (
                    <NavLink href="/admin/settings">Admin</NavLink>
                  )}
                </div>
              )}
            </div>

            {/* Right Actions */}
            <div className="flex-1 flex justify-end items-center gap-4 z-10">
              {!isLoading && (
                <>
                  {user ? (
                    <>
                      {/* Search */}
                      <div className="relative flex items-center gap-2">
                        {/* Desktop Search - Always visible on md+ */}
                        <form onSubmit={handleSearch} className="hidden md:flex relative items-center w-64">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search books..."
                            className="w-full h-9 pl-10! pr-4 text-sm bg-muted/50 border-none rounded-full focus:ring-1 focus:ring-primary/20"
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

                        {/* Mobile Search Button - Visible only on mobile when search is closed */}
                        {!isSearchOpen && (
                          <div className="md:hidden">
                            <button
                              onClick={() => setIsSearchOpen(true)}
                              className="flex p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/50 rounded-full cursor-pointer"
                              title="Search"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Desktop Only: Theme Toggle and User Menu */}
                      <div className="hidden md:flex items-center gap-4">
                        <ThemeToggle />
                        <div className="h-4 w-px bg-border/60 mx-1" />
                        <UserMenu />
                      </div>
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

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && user && (
        <div className="md:hidden absolute top-[72px] left-0 right-0 bg-background border-b border-border/40 shadow-xl animate-in slide-in-from-top-2 z-40 max-h-[calc(100vh-72px)] overflow-y-auto">
           <div className="flex flex-col p-4 gap-2">
              <Link
                href="/library"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                 <span className="font-medium">Library</span>
              </Link>
              <Link
                href="/decks"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                 <span className="font-medium">Decks</span>
              </Link>
               <Link
                href="/tags"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                 <span className="font-medium">Tags</span>
              </Link>
              <Link
                href="/sync"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                 <span className="font-medium">Sync</span>
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin/settings"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                   <span className="font-medium">Admin</span>
                </Link>
              )}

              <div className="h-px bg-border/40 my-2" />

              {/* Mobile User Actions */}
              <Link
                href="/settings/account"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                 <Settings className="w-5 h-5 text-muted-foreground" />
                 <span className="font-medium">Settings</span>
              </Link>

              <button
                onClick={() => {
                   logoutMutation.mutate();
                   closeMobileMenu();
                }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors w-full text-left"
              >
                 <LogOut className="w-5 h-5 text-muted-foreground" />
                 <span className="font-medium">Sign Out</span>
              </button>

              <div className="h-px bg-border/40 my-2" />

              <div className="flex items-center justify-between p-3">
                 <span className="text-sm text-muted-foreground">Theme</span>
                 <ThemeToggle />
              </div>
           </div>
        </div>
      )}
    </nav>
  );
}
