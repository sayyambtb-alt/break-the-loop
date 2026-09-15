import { NextResponse } from 'next/server';

export function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  let supabaseProject = 'unknown';

  try {
    supabaseProject = new URL(supabaseUrl).hostname.split('.')[0] || 'unknown';
  } catch {
    supabaseProject = 'invalid';
  }

  return NextResponse.json({
    environment: process.env.VERCEL_ENV ?? 'local',
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? 'local',
    supabaseProject,
  });
}
