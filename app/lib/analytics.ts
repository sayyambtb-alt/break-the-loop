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
  });
  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

// Links future events to the user's public handle -- not their email, so
// this stays consistent with the privacy policy's "no PII shared with
// third parties beyond Supabase" stance. A handle is already visible to
// every other user in-app, so it isn't new exposure.
export function identifyUser(handle: string) {
  if (!initialized || !handle) return;
  posthog.identify(handle);
}
