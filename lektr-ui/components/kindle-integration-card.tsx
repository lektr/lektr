"use client";

import { useState, useEffect } from "react";
import { 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Loader2, 
  ExternalLink,
  Chrome,
  Download,
  Clock,
  Zap
} from "lucide-react";
import posthog from "posthog-js";

// Type declarations for extension communication
declare global {
  interface Window {
    __LEKTR_EXTENSION__?: {
      installed: boolean;
      version: string;
    };
  }
}

interface ExtensionStatus {
  installed: boolean;
  version?: string;
  amazonLoggedIn?: boolean;
  isSyncing?: boolean;
  lastSyncTime?: string | null;
  autoSyncInterval?: number;
  error?: string;
}

const AUTO_SYNC_OPTIONS: Record<number, string> = {
  0: "Disabled",
  60: "Every hour",
  360: "Every 6 hours",
  720: "Every 12 hours",
  1440: "Once a day",
};

export function KindleIntegrationCard() {
  const [status, setStatus] = useState<ExtensionStatus>({ installed: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{success: boolean; message: string} | null>(null);

  // Track extension detection
  useEffect(() => {
    if (status.installed) {
      if (process.env.NODE_ENV !== 'development') {
        posthog.capture('extension_detected', { version: status.version });
      }
    }
  }, [status.installed, status.version]);

  // Check for extension on mount
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 200; // ms

    const checkExtension = () => {
      if (window.__LEKTR_EXTENSION__) {
        setStatus(prev => ({ ...prev, installed: true, version: window.__LEKTR_EXTENSION__!.version }));
        // Request full status
        window.dispatchEvent(new CustomEvent('lektr-check-status'));
        return true;
      }
      return false;
    };

    // Try immediately
    if (!checkExtension()) {
      // Retry a few times with delay to handle content script loading
      const retryInterval = setInterval(() => {
        retryCount++;
        if (checkExtension() || retryCount >= maxRetries) {
          clearInterval(retryInterval);
          if (retryCount >= maxRetries && !window.__LEKTR_EXTENSION__) {
            setIsLoading(false);
          }
        }
      }, retryDelay);
    }

    // Also listen for extension ready event (in case script loads after this component)
    const handleReady = (e: CustomEvent) => {
      setStatus(prev => ({ ...prev, installed: true, ...e.detail }));
      window.dispatchEvent(new CustomEvent('lektr-check-status'));
    };

    const handleStatusResponse = (e: CustomEvent) => {
      setStatus(prev => ({ ...prev, ...e.detail }));
      setIsLoading(false);
    };

    const handleSyncResponse = (e: CustomEvent) => {
      setIsSyncing(false);
      if (e.detail.error) {
        setSyncResult({ success: false, message: e.detail.error });
      } else {
        setSyncResult({ 
          success: true, 
          message: `Synced ${e.detail.highlightsImported || 0} highlights from ${e.detail.booksProcessed || 0} books`
        });
        // Refresh status after sync
        window.dispatchEvent(new CustomEvent('lektr-check-status'));
      }
    };

    window.addEventListener('lektr-extension-ready', handleReady as EventListener);
    window.addEventListener('lektr-status-response', handleStatusResponse as EventListener);
    window.addEventListener('lektr-sync-response', handleSyncResponse as EventListener);

    // Fallback timeout for loading state
    const timeout = setTimeout(() => setIsLoading(false), 2000);

    return () => {
      window.removeEventListener('lektr-extension-ready', handleReady as EventListener);
      window.removeEventListener('lektr-status-response', handleStatusResponse as EventListener);
      window.removeEventListener('lektr-sync-response', handleSyncResponse as EventListener);
      clearTimeout(timeout);
    };
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    setSyncResult(null);
    window.dispatchEvent(new CustomEvent('lektr-trigger-sync'));
  };

  const handleRefreshStatus = () => {
    setIsLoading(true);
    window.dispatchEvent(new CustomEvent('lektr-check-status'));
    setTimeout(() => setIsLoading(false), 2000);
  };

  const formatLastSync = (timestamp: string | null | undefined) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded w-32" />
            <div className="h-4 bg-muted rounded w-48" />
          </div>
        </div>
      </div>
    );
  }

  // Extension installed and connected
  if (status.installed && status.amazonLoggedIn) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-success/15 text-success flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">Kindle Highlights</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically sync your Kindle highlights
            </p>
          </div>
          <button 
            onClick={handleRefreshStatus}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Status details */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 rounded-xl bg-background/50">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-muted-foreground">Amazon:</span>
            <span className="font-medium">Logged in</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Extension:</span>
            <span className="font-medium">v{status.version}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Last sync:</span>
            <span className="font-medium">{formatLastSync(status.lastSyncTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Auto-sync:</span>
            <span className="font-medium">{AUTO_SYNC_OPTIONS[status.autoSyncInterval || 0]}</span>
          </div>
        </div>

        {/* Sync result message */}
        {syncResult && (
          <div className={`p-3 rounded-lg mb-4 text-sm ${
            syncResult.success 
              ? 'bg-success/10 text-success' 
              : 'bg-error/10 text-error'
          }`}>
            {syncResult.message}
          </div>
        )}

        {/* Actions */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="btn btn-primary w-full h-11 rounded-xl disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Sync Now
            </>
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Configure auto-sync settings in the browser extension
        </p>
      </div>
    );
  }

  // Extension installed but not logged in to Amazon
  if (status.installed && !status.amazonLoggedIn) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">Kindle Highlights</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
                <XCircle className="w-3 h-3" />
                Setup Required
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Log in to Amazon to enable automatic sync
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-background/50 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-success/15 text-success flex items-center justify-center text-sm font-bold">✓</div>
            <p className="text-sm">
              <span className="font-medium">Extension installed</span>
              <span className="text-muted-foreground"> (v{status.version})</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-warning/15 text-warning flex items-center justify-center text-sm font-bold">2</div>
            <p className="text-sm">
              <span className="font-medium">Log in to Amazon</span>
              <span className="text-muted-foreground"> in the extension popup</span>
            </p>
          </div>
        </div>

        <a
          href="https://read.amazon.com/notebook"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary w-full h-11 rounded-xl"
        >
          <ExternalLink className="w-4 h-4" />
          Open Kindle Notebook
        </a>
        
        <p className="text-xs text-muted-foreground text-center mt-3">
          Log in to Amazon, then click the Lektr extension icon to check your status
        </p>
      </div>
    );
  }

  // Extension not installed - show setup steps
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Smartphone className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">Kindle Highlights</h3>
          <p className="text-sm text-muted-foreground">
            Automatically sync highlights from your Kindle library
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex gap-4 p-4 rounded-xl bg-muted/30">
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold shrink-0">1</div>
          <div className="flex-1">
            <p className="font-medium text-sm mb-2">Install the Lektr Extension</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://chrome.google.com/webstore/detail/lektr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border/50 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <Chrome className="w-4 h-4" />
                Chrome
              </a>
              <a
                href="https://addons.mozilla.org/firefox/addon/lektr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border/50 text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Firefox
              </a>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-4 rounded-xl bg-muted/30">
          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
          <div className="flex-1">
            <p className="font-medium text-sm mb-1">Log in to Amazon</p>
            <p className="text-sm text-muted-foreground">
              Open the extension and sign in to your Amazon account
            </p>
          </div>
        </div>

        <div className="flex gap-4 p-4 rounded-xl bg-muted/30">
          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
          <div className="flex-1">
            <p className="font-medium text-sm mb-1">Start Syncing</p>
            <p className="text-sm text-muted-foreground">
              Your highlights will sync automatically
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleRefreshStatus}
        className="btn btn-secondary w-full h-11 rounded-xl"
      >
        <RefreshCw className="w-4 h-4" />
        Check Connection
      </button>
    </div>
  );
}
