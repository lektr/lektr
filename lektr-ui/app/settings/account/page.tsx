"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePassword, changeEmail, getCurrentUser, getDigestPreferences, updateDigestPreferences, type DigestPreferences } from "@/lib/api";
import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { PageHeader } from "@/components/page-header";
import { ChevronLeft, Eye, EyeOff, Lock, Shield, Mail, Bell, Clock, Globe, Calendar } from "lucide-react";
import { Switch } from "@/components/switch";
import Link from "next/link";

const TIMEZONE_OPTIONS = [
  "UTC", "US/Eastern", "US/Central", "US/Mountain", "US/Pacific",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Asia/Dubai",
  "Australia/Sydney", "Pacific/Auckland",
  "America/Sao_Paulo", "America/Mexico_City", "Africa/Cairo",
];

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Every day",
  weekdays: "Weekdays only",
  weekly: "Weekly (Mondays)",
};

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

        {/* Daily Digest Preferences Card */}
        <DigestPreferencesCard />
      </div>
    </AuthGuard>
  );
}

function DigestPreferencesCard() {
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: ["digestPreferences"],
    queryFn: getDigestPreferences,
  });

  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState<"daily" | "weekdays" | "weekly">("daily");
  const [digestHour, setDigestHour] = useState(8);
  const [digestTimezone, setDigestTimezone] = useState("UTC");

  // Sync fetched prefs into local state
  useEffect(() => {
    if (prefs) {
      setDigestEnabled(prefs.digestEnabled);
      setDigestFrequency(prefs.digestFrequency);
      setDigestHour(prefs.digestHour);
      setDigestTimezone(prefs.digestTimezone);
    }
  }, [prefs]);

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<DigestPreferences>) => updateDigestPreferences(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["digestPreferences"] });
      toast.success("Digest preferences saved");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save preferences"),
  });

  const handleToggle = (next: boolean) => {
    setDigestEnabled(next);
    updateMutation.mutate({ digestEnabled: next });
  };

  const handleFrequencyChange = (value: "daily" | "weekdays" | "weekly") => {
    setDigestFrequency(value);
    updateMutation.mutate({ digestFrequency: value });
  };

  const handleHourChange = (value: number) => {
    setDigestHour(value);
    updateMutation.mutate({ digestHour: value });
  };

  const handleTimezoneChange = (value: string) => {
    setDigestTimezone(value);
    updateMutation.mutate({ digestTimezone: value });
  };

  const formatHour = (h: number) => {
    if (h === 0) return "12:00 AM";
    if (h === 12) return "12:00 PM";
    return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
  };

  if (isLoading) {
    return (
      <div className="mt-6 rounded-xl border border-border/50 bg-card p-6 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-muted/50 rounded mb-4" />
        <div className="h-4 w-64 bg-muted/50 rounded" />
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-border/50 bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-full bg-accent/10">
          <Bell className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-lg">Daily Digest</h2>
          <p className="text-sm text-muted-foreground">
            Receive highlights for spaced repetition review via email
          </p>
        </div>

        {/* Toggle */}
        <Switch
          checked={digestEnabled}
          onCheckedChange={handleToggle}
          disabled={updateMutation.isPending}
        />
      </div>

      {digestEnabled && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Frequency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Frequency
            </label>
            <div className="flex gap-2 flex-wrap">
              {(["daily", "weekdays", "weekly"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => handleFrequencyChange(freq)}
                  disabled={updateMutation.isPending}
                  className={`px-4 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
                    digestFrequency === freq
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {FREQUENCY_LABELS[freq]}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Time */}
          <div className="space-y-2">
            <label htmlFor="digestHour" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Delivery Time
            </label>
            <div className="relative">
              <select
                id="digestHour"
                value={digestHour}
                onChange={(e) => handleHourChange(Number(e.target.value))}
                disabled={updateMutation.isPending}
                className="w-full h-auto px-4 py-3 pr-10 bg-muted/50 border-none text-sm leading-normal focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '12px' }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <label htmlFor="digestTimezone" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Timezone
            </label>
            <div className="relative">
              <select
                id="digestTimezone"
                value={digestTimezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                disabled={updateMutation.isPending}
                className="w-full h-auto px-4 py-3 pr-10 bg-muted/50 border-none text-sm leading-normal focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '12px' }}
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            📬 You&apos;ll receive your digest <strong className="text-foreground">{FREQUENCY_LABELS[digestFrequency].toLowerCase()}</strong> at{" "}
            <strong className="text-foreground">{formatHour(digestHour)}</strong>{" "}
            <span className="text-xs">({digestTimezone.replace(/_/g, " ")})</span>
          </div>
        </div>
      )}
    </div>
  );
}
