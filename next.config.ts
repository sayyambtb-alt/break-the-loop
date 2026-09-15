import type { NextConfig } from "next";

const isSecurityReviewPreview =
  process.env.VERCEL_GIT_COMMIT_REF === "codex/break-the-loop-security-review";

const nextConfig: NextConfig = {
  env: isSecurityReviewPreview
    ? {
        NEXT_PUBLIC_SUPABASE_URL: "https://fcghxdedrnnfdvppnvfi.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_9FjOQoCQHUAGvHeitRwglQ_nRrUlxwE",
      }
    : {},
};

export default nextConfig;
