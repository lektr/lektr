"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      const msg = "Passwords do not match";
      setError(msg);
      toast.error("Validation error", { description: msg });
      return;
    }

    if (password.length < 8) {
      const msg = "Password must be at least 8 characters";
      setError(msg);
      toast.error("Validation error", { description: msg });
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      await queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast.success("Account created!", { description: "Welcome to Lektr" });
      router.push("/library");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      toast.error("Registration failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-12 sm:py-20">
      <div className="max-w-sm mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Lektr
          </Link>
          <h1 className="text-xl text-muted-foreground">Create your account</h1>
        </div>

        <div className="card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                minLength={8}
              />
              <p className="text-xs text-muted-foreground mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-error/10 text-error text-sm" role="alert">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full btn btn-primary text-base py-4">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
