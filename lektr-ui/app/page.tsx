"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getCurrentUser, getBooks, getReviewQueue } from "@/lib/api";
import { RediscoveryFeed } from "@/components/rediscovery-feed";
import {
  BookOpen,
  Upload,
  GraduationCap,
  Library,
  ArrowRight,
  Sparkles,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { data: booksData } = useQuery({
    queryKey: ["books"],
    queryFn: getBooks,
  });

  const { data: reviewData } = useQuery({
    queryKey: ["review"],
    queryFn: getReviewQueue,
  });

  const { data: authData } = useQuery({
    queryKey: ["auth"],
    queryFn: getCurrentUser,
  });

  const totalBooks = booksData?.books?.filter((b) => b.highlightCount > 0).length ?? 0;
  const totalHighlights =
    booksData?.books?.reduce((sum, b) => sum + b.highlightCount, 0) ?? 0;
  const dueCount = reviewData?.total ?? 0;
  const userEmail = authData?.user?.email ?? "";
  const displayName = userEmail.split("@")[0];

  return (
    <div className="container py-8 min-h-screen animate-fade-in">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {getGreeting()}, {displayName} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s a glimpse into your reading knowledge
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10">
        <Link
          href="/library"
          className="card card-interactive p-4 flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
            <Library className="w-5 h-5 text-primary" />
          </div>
          <span className="text-2xl font-bold">{totalBooks}</span>
          <span className="text-xs text-muted-foreground">Books</span>
        </Link>

        <Link
          href="/library"
          className="card card-interactive p-4 flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-2 group-hover:bg-accent/20 transition-colors">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <span className="text-2xl font-bold">{totalHighlights}</span>
          <span className="text-xs text-muted-foreground">Highlights</span>
        </Link>

        <Link
          href="/decks"
          className="card card-interactive p-4 flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-2 group-hover:bg-warning/20 transition-colors">
            <GraduationCap className="w-5 h-5 text-warning" />
          </div>
          <span className="text-2xl font-bold">{dueCount}</span>
          <span className="text-xs text-muted-foreground">Due for review</span>
        </Link>
      </div>

      {/* Rediscovery Feed */}
      <RediscoveryFeed count={3} />

      {/* Quick actions */}
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/library" className="btn btn-secondary text-sm gap-2">
          <BookOpen className="w-4 h-4" />
          Go to Library
          <ArrowRight className="w-3.5 h-3.5 opacity-50" />
        </Link>
        <Link href="/sync" className="btn btn-secondary text-sm gap-2">
          <Upload className="w-4 h-4" />
          Sync Highlights
        </Link>
        {dueCount > 0 && (
          <Link href="/decks" className="btn btn-primary text-sm gap-2">
            <GraduationCap className="w-4 h-4" />
            Review {dueCount} Due
            <ArrowRight className="w-3.5 h-3.5 opacity-80" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { data: authData, isLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: getCurrentUser,
  });

  const isLoggedIn = !!authData?.user;

  if (isLoading) {
    return (
      <div className="container py-20">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isLoggedIn) {
    return <Dashboard />;
  }

  // Logged-out: marketing landing page
  return (
    <div className="container py-16 sm:py-24">
      {/* Hero Section */}
      <section className="max-w-3xl mx-auto text-center mb-20 animate-fade-in">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
          <span className="bg-linear-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Stop Forgetting
          </span>
          <br />
          <span className="text-foreground">What You Read</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
          The open-source, local-first spaced repetition engine for your highlights.
          Retain more of what you read with active recall.
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Ready to build your second brain?
        </h2>
        <p className="text-muted-foreground mb-8">
          Start by importing your highlights from Kindle or KOReader.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="btn btn-primary text-lg px-8 py-4">
            Get Started
          </Link>
          <Link href="/login" className="btn btn-secondary text-lg px-8 py-4">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-4xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">KOReader Import</h3>
            <p className="text-sm text-muted-foreground">
              Seamlessly import highlights from your e-reader with full metadata support.
            </p>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <span className="text-2xl">🧠</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Spaced Repetition</h3>
            <p className="text-sm text-muted-foreground">
              FSRS-powered daily reviews help you remember what matters most.
            </p>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Semantic Search</h3>
            <p className="text-sm text-muted-foreground">
              Find similar ideas across your entire library using AI embeddings.
            </p>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
            <p className="text-sm text-muted-foreground">
              Self-hosted and local-first. Your data stays on your infrastructure.
            </p>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.5s" }}>
            <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center mb-4">
              <span className="text-2xl">📱</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Mobile Ready</h3>
            <p className="text-sm text-muted-foreground">
              Responsive design that works beautifully on any device.
            </p>
          </div>

          <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.6s" }}>
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <span className="text-2xl">🖥️</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Open Source</h3>
            <p className="text-sm text-muted-foreground">
              Free and open source. Extend or modify to fit your workflow.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
