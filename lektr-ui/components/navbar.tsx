"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { Logo } from "@/components/logo";
import { Search, Menu, X, Library, Sparkles, Layers, Tag, RefreshCw } from "lucide-react";

export function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
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

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Cmd+K / Ctrl+K keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Scroll lock when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileMenuOpen]);

  const navItems = [
    { href: "/library", label: "Library", icon: Library },
    { href: "/rediscover", label: "Rediscover", icon: Sparkles },
    { href: "/decks", label: "Decks", icon: Layers },
    { href: "/tags", label: "Tags", icon: Tag },
    { href: "/sync", label: "Sync", icon: RefreshCw },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all">
      <div className="container flex items-center h-18 gap-4 relative">

        {/* Mobile Search Overlay */}
        {isSearchOpen && (
          <form
            onSubmit={handleSearch}
            className="nav:hidden absolute inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center px-4 gap-2 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                ref={mobileSearchInputRef}
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setIsSearchOpen(false)}
                placeholder="Search..."
                className="w-full h-10 pl-10 pr-4 text-base bg-muted/50 border-none rounded-full focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/50 rounded-full cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </form>
        )}

        {/* Mobile Menu Button - Left */}
        {user && (
          <div className="nav:hidden z-10 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        )}

        {/* Brand - Absolute Center on Mobile, Left on Desktop */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 nav:static nav:translate-x-0 nav:translate-y-0 nav:flex-1 nav:flex nav:justify-start z-20">
          <Link href="/" className="hover:opacity-80 transition-opacity flex items-center" onClick={closeMobileMenu}>
            <Logo />
          </Link>
        </div>

        {/* Centered Desktop Navigation */}
        <div className="hidden nav:flex flex-1 justify-center">
          {user && (
            <div className="flex items-center gap-1 p-1 rounded-full border border-border/50 bg-background/50 shadow-sm">
              {navItems.map(({ href, label }) => (
                <NavLink key={href} href={href}>{label}</NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex-1 flex justify-end items-center gap-2 z-10">
          {!isLoading && (
            <>
              {user ? (
                <>
                  {/* Desktop Search */}
                  <form onSubmit={handleSearch} className="hidden nav:flex relative items-center w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search books...  ⌘K"
                      className="w-full h-9 pl-10 pr-4 text-sm bg-muted/50 border-none rounded-full focus:ring-1 focus:ring-primary/20"
                    />
                  </form>

                  {/* Mobile Search Button */}
                  {!isSearchOpen && (
                    <button
                      onClick={() => setIsSearchOpen(true)}
                      className="nav:hidden flex p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/50 rounded-full cursor-pointer"
                      title="Search"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  )}

                  {/* User Menu (avatar dropdown) */}
                  <UserMenu user={user} />
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

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && user && (
        <div
          className="nav:hidden fixed inset-0 top-18 bg-black/20 z-30 animate-in fade-in duration-200"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Menu */}
      {isMobileMenuOpen && user && (
        <div className="nav:hidden absolute top-18 left-0 right-0 bg-background border-b border-border/40 shadow-xl animate-in slide-in-from-top-2 z-40 max-h-[calc(100vh-72px)] overflow-y-auto">
          <div className="flex flex-col p-4 gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobileMenu}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
