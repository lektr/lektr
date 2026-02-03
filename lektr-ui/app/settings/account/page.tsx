"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePassword, changeEmail, getCurrentUser } from "@/lib/api";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { PageHeader } from "@/components/page-header";
import { ChevronLeft, Eye, EyeOff, Lock, Shield, Mail } from "lucide-react";
import Link from "next/link";

export default function AccountSettingsPage() {
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: getCurrentUser,
  });
  const user = userData?.user;

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email change mutation
  const changeEmailMutation = useMutation({
    mutationFn: () => changeEmail(newEmail, emailPassword),
    onSuccess: () => {
      toast.success("Email changed successfully");
      setNewEmail("");
      setEmailPassword("");
      // Refresh user data to show new email
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change email");
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to change password");
    },
  });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (newEmail === user?.email) {
      toast.error("New email must be different from current email");
      return;
    }

    changeEmailMutation.mutate();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    changePasswordMutation.mutate();
  };

  const isEmailValid =
    newEmail.length > 0 &&
    newEmail.includes("@") &&
    emailPassword.length > 0 &&
    newEmail !== user?.email;

  const isPasswordValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    currentPassword !== newPassword;

  return (
    <AuthGuard>
      <div className="container max-w-2xl py-8 px-4 sm:px-6">
        {/* Back navigation */}
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 rounded-full px-3 py-1.5 hover:bg-muted/50"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Library
        </Link>

        <PageHeader
          title="Account Settings"
          description="Manage your account security and preferences"
        />

        {/* Change Email Card */}
        <div className="mt-8 rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-full bg-secondary/10">
              <Mail className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Change Email</h2>
              <p className="text-sm text-muted-foreground">
                Update your email address (current: {user?.email})
              </p>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-5">
            {/* New Email */}
            <div className="space-y-2">
              <label
                htmlFor="newEmail"
                className="text-sm font-medium text-foreground"
              >
                New Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter your new email address"
                  className="w-full h-11 !pl-10 !pr-4 rounded-full bg-muted/50 border-none text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password for verification */}
            <div className="space-y-2">
              <label
                htmlFor="emailPassword"
                className="text-sm font-medium text-foreground"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="emailPassword"
                  type={showEmailPassword ? "text" : "password"}
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Enter your password to confirm"
                  className="w-full h-11 !pl-10 !pr-12 rounded-full bg-muted/50 border-none text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showEmailPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isEmailValid || changeEmailMutation.isPending}
                className="w-full sm:w-auto px-8 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-full hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
              >
                {changeEmailMutation.isPending
                  ? "Changing Email..."
                  : "Change Email"}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="mt-6 rounded-xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-full bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Change Password</h2>
              <p className="text-sm text-muted-foreground">
                Update your password to keep your account secure
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            {/* Current Password */}
            <div className="space-y-2">
              <label
                htmlFor="currentPassword"
                className="text-sm font-medium text-foreground"
              >
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full h-11 !pl-10 !pr-12 rounded-full bg-muted/50 border-none text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label
                htmlFor="newPassword"
                className="text-sm font-medium text-foreground"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password (min 8 characters)"
                  className="w-full h-11 !pl-10 !pr-12 rounded-full bg-muted/50 border-none text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-destructive">
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="w-full h-11 !pl-10 !pr-12 rounded-full bg-muted/50 border-none text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isPasswordValid || changePasswordMutation.isPending}
                className="w-full sm:w-auto px-8 py-2.5 bg-primary text-primary-foreground font-medium rounded-full hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
              >
                {changePasswordMutation.isPending
                  ? "Changing Password..."
                  : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
