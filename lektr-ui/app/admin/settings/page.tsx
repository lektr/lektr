"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSettings,
  updateSettings,
  checkLengthReduction,
  refreshMissingMetadata,
  getEmailSettings,
  updateEmailSettings,
  sendTestEmail,
  triggerDigest,
  type EmailSettings
} from "@/lib/api";
import { AuthGuard } from "@/components/auth-guard";
import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/switch";
import { Modal } from "@/components/modal";

interface ReductionWarning {
  setting: string;
  oldValue: number;
  newValue: number;
  affectedCount: number;
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();

  const [maxHighlightLength, setMaxHighlightLength] = useState("");
  const [maxNoteLength, setMaxNoteLength] = useState("");
  const [displayCollapseLength, setDisplayCollapseLength] = useState("");
  const [themeDefault, setThemeDefault] = useState("auto");
  const [telemetryEnabled, setTelemetryEnabled] = useState("true");
  const [showWarning, setShowWarning] = useState<ReductionWarning | null>(null);
  const [pendingSave, setPendingSave] = useState<Record<string, string> | null>(null);

  // Email settings state
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({});
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const [showDigestConfirm, setShowDigestConfirm] = useState(false);
  const [digestResult, setDigestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const { data: emailData, isLoading: emailLoading } = useQuery({
    queryKey: ["email-settings"],
    queryFn: getEmailSettings,
  });

  // Initialize form when settings load
  useEffect(() => {
    if (settingsData?.settings) {
      setMaxHighlightLength(settingsData.settings.max_highlight_length?.value || "5000");
      setMaxNoteLength(settingsData.settings.max_note_length?.value || "1000");
      setDisplayCollapseLength(settingsData.settings.display_collapse_length?.value || "500");
      setThemeDefault(settingsData.settings.theme_default?.value || "auto");
      setTelemetryEnabled(settingsData.settings.telemetry_enabled?.value || "true");
    }
  }, [settingsData]);

  // Initialize email settings form
  useEffect(() => {
    if (emailData?.settings) {
      setEmailSettings(emailData.settings);
    }
  }, [emailData]);

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setPendingSave(null);
    },
  });

  const metadataMutation = useMutation({
    mutationFn: refreshMissingMetadata,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });

  const emailMutation = useMutation({
    mutationFn: updateEmailSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: sendTestEmail,
    onSuccess: (data) => {
      setTestEmailResult(data);
    },
    onError: (error) => {
      setTestEmailResult({ success: false, error: error instanceof Error ? error.message : "Test failed" });
    },
  });

  const digestMutation = useMutation({
    mutationFn: triggerDigest,
    onSuccess: (data) => {
      setDigestResult({ success: true, message: data.message });
      setShowDigestConfirm(false);
    },
    onError: (error) => {
      setDigestResult({ success: false, error: error instanceof Error ? error.message : "Failed to trigger digest" });
      setShowDigestConfirm(false);
    },
  });

  const handleSave = async () => {
    const updates: Record<string, string> = {};
    const currentMaxHighlight = parseInt(settingsData?.settings.max_highlight_length?.value || "5000", 10);
    const newMaxHighlight = parseInt(maxHighlightLength, 10);

    // Check if highlight length is being reduced
    if (newMaxHighlight < currentMaxHighlight) {
      try {
        const { affectedCount } = await checkLengthReduction(newMaxHighlight);
        if (affectedCount > 0) {
          setShowWarning({
            setting: "max_highlight_length",
            oldValue: currentMaxHighlight,
            newValue: newMaxHighlight,
            affectedCount,
          });
          setPendingSave({
            max_highlight_length: maxHighlightLength,
            max_note_length: maxNoteLength,
            display_collapse_length: displayCollapseLength,
            theme_default: themeDefault,
          });
          return;
        }
      } catch (error) {
        console.error("Failed to check reduction impact:", error);
      }
    }

    // No warning needed, save directly
    updates.max_highlight_length = maxHighlightLength;
    updates.max_note_length = maxNoteLength;
    updates.display_collapse_length = displayCollapseLength;
    updates.theme_default = themeDefault;
    updates.telemetry_enabled = telemetryEnabled;

    updateMutation.mutate(updates);
  };

  const confirmSave = () => {
    if (pendingSave) {
      updateMutation.mutate(pendingSave);
      setShowWarning(null);
    }
  };

  const cancelSave = () => {
    setShowWarning(null);
    setPendingSave(null);
    // Reset to original value
    if (settingsData?.settings) {
      setMaxHighlightLength(settingsData.settings.max_highlight_length?.value || "5000");
    }
  };

  const handleSaveEmailSettings = () => {
    emailMutation.mutate(emailSettings);
  };

  const handleTestEmail = () => {
    if (testEmailAddress) {
      setTestEmailResult(null);
      testEmailMutation.mutate(testEmailAddress);
    }
  };

  return (
    <AuthGuard requiredRole="admin">
      <div className="container py-8 max-w-[1200px] mx-auto min-h-screen">
        <div className="max-w-2xl mx-auto">
          <PageHeader
            title="Admin Settings"
            description="Manage global configuration and system defaults."
          />

        {/* Warning Modal */}
        {showWarning && (
          <Modal onClose={cancelSave}>
              <h2 className="text-xl font-serif font-bold mb-4 text-warning flex items-center gap-2">
                ⚠️ Possible Data Impact
              </h2>
              <p className="text-muted-foreground mb-4">
                Reducing max highlight length from <strong>{showWarning.oldValue}</strong> to{" "}
                <strong>{showWarning.newValue}</strong> characters.
              </p>
              <div className="bg-warning/10 rounded-xl p-4 mb-6">
                <p className="text-warning-foreground font-medium">
                  {showWarning.affectedCount} existing highlights exceed the new limit.
                </p>
                <p className="text-sm text-warning-foreground/80 mt-1">
                  They will not be truncated, but future edits will be limited.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelSave}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSave}
                  className="px-6 py-2 rounded-full bg-warning text-warning-foreground hover:bg-warning/90 transition-all duration-200 font-medium shadow-sm"
                >
                  Save Anyway
                </button>
              </div>
          </Modal>
        )}

        {/* Digest Confirmation Modal */}
        {showDigestConfirm && (
          <Modal onClose={() => setShowDigestConfirm(false)}>
              <h2 className="text-xl font-serif font-bold mb-4 text-foreground flex items-center gap-2">
                📬 Send Daily Digest
              </h2>
              <p className="text-muted-foreground mb-6">
                This will send a digest email to <strong>all users</strong> with digest enabled.
                Each email will contain up to 5 highlights selected by spaced repetition.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDigestConfirm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => digestMutation.mutate()}
                  disabled={digestMutation.isPending}
                  className="btn btn-primary"
                >
                  {digestMutation.isPending ? "Sending..." : "Send Now"}
                </button>
              </div>
          </Modal>
        )}

        {isLoading ? (
          <div className="space-y-8">
            <div className="h-64 skeleton w-full rounded-xl"></div>
            <div className="h-48 skeleton w-full rounded-xl"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Email Configuration */}
            <section className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <h2 className="font-serif text-xl font-bold mb-2 text-foreground">📧 Email Configuration</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Configure SMTP settings for sending transactional and digest emails.
                {emailData?.envFallback && (
                  <span className="ml-2 text-xs text-primary">(Using environment variables)</span>
                )}
              </p>

              {emailLoading ? (
                <div className="h-40 skeleton w-full rounded-xl"></div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="smtp-host" className="block text-sm font-medium text-foreground mb-1">
                        SMTP Host
                      </label>
                      <input
                        id="smtp-host"
                        type="text"
                        placeholder="smtp.example.com"
                        value={emailSettings.smtp_host || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                        className="w-full bg-muted/50 border-none rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="smtp-port" className="block text-sm font-medium text-foreground mb-1">
                        SMTP Port
                      </label>
                      <input
                        id="smtp-port"
                        type="number"
                        placeholder="587"
                        value={emailSettings.smtp_port || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtp_port: e.target.value })}
                        className="w-full bg-muted/50 border-none rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="smtp-user" className="block text-sm font-medium text-foreground mb-1">
                        SMTP Username
                      </label>
                      <input
                        id="smtp-user"
                        type="text"
                        placeholder="user@example.com"
                        value={emailSettings.smtp_user || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtp_user: e.target.value })}
                        className="w-full bg-muted/50 border-none rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="smtp-pass" className="block text-sm font-medium text-foreground mb-1">
                        SMTP Password
                      </label>
                      <input
                        id="smtp-pass"
                        type="password"
                        placeholder="••••••••"
                        value={emailSettings.smtp_pass || ""}
                        onChange={(e) => setEmailSettings({ ...emailSettings, smtp_pass: e.target.value })}
                        className="w-full bg-muted/50 border-none rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="smtp-secure"
                      type="checkbox"
                      checked={emailSettings.smtp_secure === "true"}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtp_secure: e.target.checked ? "true" : "false" })}
                      className="w-4 h-4 rounded border-border accent-primary"
                    />
                    <label htmlFor="smtp-secure" className="text-sm text-foreground">
                      Use TLS/SSL (port 465)
                    </label>
                  </div>

                  <div className="pt-4 border-t border-border/30">
                    <h3 className="text-sm font-medium text-foreground mb-3">Sender Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="mail-from-name" className="block text-sm font-medium text-foreground mb-1">
                          Sender Name
                        </label>
                        <input
                          id="mail-from-name"
                          type="text"
                          placeholder="Lektr"
                          value={emailSettings.mail_from_name || ""}
                          onChange={(e) => setEmailSettings({ ...emailSettings, mail_from_name: e.target.value })}
                          className="w-full bg-muted/50 border-none rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div>
                        <label htmlFor="mail-from-email" className="block text-sm font-medium text-foreground mb-1">
                          Sender Email
                        </label>
                        <input
                          id="mail-from-email"
                          type="email"
                          placeholder="noreply@example.com"
                          value={emailSettings.mail_from_email || ""}
                          onChange={(e) => setEmailSettings({ ...emailSettings, mail_from_email: e.target.value })}
                          className="w-full bg-muted/50 border-none rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Test Email */}
                  <div className="pt-4 border-t border-border/30">
                    <h3 className="text-sm font-medium text-foreground mb-3">Test Connection</h3>
                    <div className="flex gap-3">
                      <input
                        type="email"
                        placeholder="test@example.com"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        className="flex-1 bg-muted/50 border-none rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                      <button
                        onClick={handleTestEmail}
                        disabled={testEmailMutation.isPending || !testEmailAddress}
                        className="btn btn-secondary"
                      >
                        {testEmailMutation.isPending ? "Sending..." : "Send Test"}
                      </button>
                    </div>
                    {testEmailResult && (
                      <div className={`mt-3 p-3 rounded-lg text-sm ${testEmailResult.success ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                        {testEmailResult.success ? `✅ ${testEmailResult.message}` : `❌ ${testEmailResult.error}`}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveEmailSettings}
                      disabled={emailMutation.isPending}
                      className="btn btn-primary"
                    >
                      {emailMutation.isPending ? "Saving..." : "Save Email Settings"}
                    </button>
                  </div>

                  {emailMutation.isSuccess && (
                    <div className="bg-success/10 text-success text-center p-3 rounded-lg text-sm animate-fade-in">
                      Email settings saved successfully!
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Digest Emails */}
            <section className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <h2 className="font-serif text-xl font-bold mb-2 text-foreground">📬 Daily Digest</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Send daily digest emails containing highlights for spaced repetition review.
              </p>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    Send Digest Now
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Manually trigger digest emails for all users with digest enabled.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDigestResult(null);
                    setShowDigestConfirm(true);
                  }}
                  disabled={!emailData?.isConfigured}
                  className="btn btn-secondary"
                >
                  Send Digest
                </button>
              </div>

              {!emailData?.isConfigured && (
                <div className="mt-4 bg-warning/10 text-warning-foreground p-3 rounded-lg text-sm">
                  ⚠️ Configure email settings above to enable digest emails.
                </div>
              )}

              {digestResult && (
                <div className={`mt-4 p-3 rounded-lg text-sm animate-fade-in ${digestResult.success ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                  {digestResult.success ? `✅ ${digestResult.message}` : `❌ ${digestResult.error}`}
                </div>
              )}
            </section>

            {/* Privacy & Telemetry */}
            <section className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <h2 className="font-serif text-xl font-bold mb-6 text-foreground">Privacy & Telemetry</h2>

              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground mb-1">Anonymous Usage Statistics</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Help us improve Lektr by sending anonymous usage data. We respect your privacy and never track personal content.
                    <br/>
                    <a
                      href="https://lektr.app/docs/admin/telemetry"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      Learn more about what we collect
                    </a>
                  </p>
                </div>

                <div className="flex items-center h-full pt-1">
                  <Switch
                    checked={telemetryEnabled === "true"}
                    onCheckedChange={(checked) => setTelemetryEnabled(checked ? "true" : "false")}
                  />
                </div>
              </div>
            </section>

            {/* Highlight Length Settings */}
            <section className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <h2 className="font-serif text-xl font-bold mb-6 text-foreground">Highlight Limits</h2>

              <div className="space-y-6">
                <div>
                  <label htmlFor="max-highlight" className="block text-sm font-medium text-foreground mb-2">
                    Maximum Highlight Length
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="max-highlight"
                      type="number"
                      min="100"
                      max="50000"
                      value={maxHighlightLength}
                      onChange={(e) => setMaxHighlightLength(e.target.value)}
                      className="w-32 bg-muted/50 border-none rounded-full px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <span className="text-muted-foreground text-sm">characters</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Highlights longer than this will be truncated on import. Original is always preserved.
                  </p>
                </div>

                <div>
                  <label htmlFor="max-note" className="block text-sm font-medium text-foreground mb-2">
                    Maximum Note Length
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="max-note"
                      type="number"
                      min="100"
                      max="10000"
                      value={maxNoteLength}
                      onChange={(e) => setMaxNoteLength(e.target.value)}
                      className="w-32 bg-muted/50 border-none rounded-full px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <span className="text-muted-foreground text-sm">characters</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="display-collapse" className="block text-sm font-medium text-foreground mb-2">
                    Display Collapse Length
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="display-collapse"
                      type="number"
                      min="100"
                      max="5000"
                      value={displayCollapseLength}
                      onChange={(e) => setDisplayCollapseLength(e.target.value)}
                      className="w-32 bg-muted/50 border-none rounded-full px-4 py-2 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <span className="text-muted-foreground text-sm">characters</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Highlights longer than this show "Show more" toggle in the UI.
                  </p>
                </div>
              </div>
            </section>

            {/* Theme Settings */}
            <section className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <h2 className="font-serif text-xl font-bold mb-6 text-foreground">Appearance</h2>

              <div>
                <label htmlFor="theme-default" className="block text-sm font-medium text-foreground mb-2">
                  Default Theme
                </label>
                <div className="relative w-48">
                  <select
                    id="theme-default"
                    value={themeDefault}
                    onChange={(e) => setThemeDefault(e.target.value)}
                    className="w-full appearance-none bg-muted/50 border-none rounded-full px-4 py-2 pr-8 focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="auto">Auto (System)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Sets the default theme for new users. Users can override this with their own preference.
                </p>
              </div>
            </section>

            {/* Library Maintenance */}
            <section className="bg-card border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <h2 className="font-serif text-xl font-bold mb-6 text-foreground">Library Maintenance</h2>

              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-1">
                      Refresh Missing Covers
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Fetch metadata and cover images for books that don't have covers.
                    </p>
                  </div>
                  <button
                    onClick={() => metadataMutation.mutate()}
                    disabled={metadataMutation.isPending}
                    className="btn btn-secondary"
                  >
                    {metadataMutation.isPending ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {metadataMutation.isSuccess && (
                  <div className="mt-4 bg-success/10 text-success p-3 rounded-xl text-sm animate-fade-in">
                    ✅ {metadataMutation.data?.message}
                  </div>
                )}

                {metadataMutation.isError && (
                  <div className="mt-4 bg-error/10 text-error p-3 rounded-xl text-sm animate-fade-in">
                    {metadataMutation.error instanceof Error ? metadataMutation.error.message : "Failed to refresh metadata"}
                  </div>
                )}
              </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="btn btn-primary"
              >
                {updateMutation.isPending ? "Saving..." : "Save Settings"}
              </button>
            </div>

            {updateMutation.isSuccess && (
              <div className="bg-success/10 text-success text-center p-3 rounded-full animate-fade-in">
                Settings saved successfully!
              </div>
            )}

            {updateMutation.isError && (
              <div className="bg-error/10 text-error text-center p-3 rounded-full animate-fade-in">
                 {updateMutation.error instanceof Error ? updateMutation.error.message : "Failed to save settings"}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </AuthGuard>
  );
}

