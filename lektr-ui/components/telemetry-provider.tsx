
"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/api";

const POSTHOG_KEY = "phc_jiZH90pf8c5vN4DnvPCTcaesPoFfbW2OLiusYyzu9cy"; // Replace with actual key or env var if needed
const POSTHOG_HOST = "https://app.posthog.com";

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  // Fetch settings to check if telemetry is enabled
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // Skip telemetry entirely in development
    if (isDev) return;

    // Check if telemetry is explicitly disabled
    const enabled = settingsData?.settings?.telemetry_enabled?.value;

    // Default to enabled if not set, or checks for specific "false" string
    const isEnabled = enabled !== "false";

    if (isEnabled && typeof window !== 'undefined') {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only',
        capture_pageview: false,
        autocapture: true,
      });
    } else {
      // If disabled, ensure we stop capturing and clear opt-in
      if (posthog.__loaded) {
        posthog.opt_out_capturing();
      }
    }
  }, [settingsData, isDev]);

  // Track page views
  useEffect(() => {
    if (isDev) return;
    if (typeof window !== 'undefined' && settingsData?.settings?.telemetry_enabled?.value !== "false") {
      posthog.capture('$pageview');
    }
  }, [settingsData, isDev]);

  return <>{children}</>;
}
