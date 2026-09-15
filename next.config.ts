import type { NextConfig } from "next";

const securityPreviewBranches = new Set([
  "codex/break-the-loop-security-review",
  "codex/break-the-loop-security-main-sync",
]);

const isSecurityReviewPreview = securityPreviewBranches.has(
  process.env.VERCEL_GIT_COMMIT_REF ?? ""
);

const nextConfig: NextConfig = {
  env: isSecurityReviewPreview
    ? {
        NEXT_PUBLIC_SUPABASE_URL: "https://fcghxdedrnnfdvppnvfi.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_9FjOQoCQHUAGvHeitRwglQ_nRrUlxwE",
      }
    : {},
};

export default nextConfig;
