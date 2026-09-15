import posthog from "posthog-js";

let initialized = false;

// Safe to call even before a PostHog key is configured -- every function
// here silently no-ops until NEXT_PUBLIC_POSTHOG_KEY is actually set, so
// this can ship now and start working the moment the key is added later.
export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: true,
    autocapture: false,
    disable_session_recording: true,
  });
  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

// Use the stable account ID, never an editable handle or email address.
export function identifyUser(userId: string) {
  if (!initialized || !userId) return;
  posthog.identify(userId);
}

export function resetAnalytics() {
  if (initialized) posthog.reset();
}
