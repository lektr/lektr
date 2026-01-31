"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  const { data: authData, isLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: getCurrentUser,
  });

  const isLoggedIn = !!authData?.user;

  // Redirect logged-in users to library
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      router.push("/library");
    }
  }, [isLoading, isLoggedIn, router]);

  // Show loading or redirect for logged-in users
  if (isLoading || isLoggedIn) {
    return (
      <div className="container py-20">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
