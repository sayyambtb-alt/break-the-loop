import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Break The Loop",
  description: "How Break The Loop collects, uses, and protects your data.",
};

// Wraps a placeholder that still needs real content filled in before this
// page is truly ready for real users. Visually loud on purpose -- this
// should be impossible to miss on the live page until every one is gone.
function TODO({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border-2 border-ink bg-gold px-1.5 py-0.5 font-bold text-ink">
      {children}
    </span>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-9 mb-3 font-display text-xl font-bold text-ink">{children}</h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 leading-relaxed text-ink-soft">{children}</p>;
}

export default function PrivacyPolicy() {
  return (
    <main className="relative min-h-dvh bg-cream px-4 py-8 sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 halftone opacity-[0.05]" />
        <div className="absolute -top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,165,36,0.32)_0%,rgba(245,165,36,0)_70%)]" />
      </div>
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-block rounded-xl sticker-sm press-sm bg-white px-3 py-2 text-sm font-bold text-ink"
        >
          ← Back to Break The Loop
        </Link>

        <div className="mt-4 rounded-3xl sticker bg-white p-5 sm:p-10">
          <h1 className="mb-1 font-display text-3xl font-bold text-ink sm:text-4xl">Privacy Policy</h1>
          <p className="mb-6 text-sm font-semibold text-muted">Last updated: September 10, 2026</p>

          <P>
            This Privacy Policy explains what information Break The Loop ("we," "us," "the App") collects when
            you use breaktheloopapp.in, why we collect it, and what rights you have over it. It is written to
            comply with India's Digital Personal Data Protection Act, 2023 ("DPDP Act") and the Information
            Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 ("IT Rules").
          </P>
          <P>
            By using Break The Loop, you consent to the collection and use of your information as described
            here. If you do not agree, please do not use the App.
          </P>

          <H2>1. Who we are</H2>
          <P>
            Break The Loop is a Mumbai-based app that gives you random real-world micro-missions (Solo, Duo, or
            Squad) and helps you discover hyper-local "hidden gem" spots in your neighborhood, submitted by
            other users.
          </P>
          <div className="space-y-1 rounded-2xl sticker-flat bg-cream p-4 text-sm text-ink-soft">
            <p><strong>Data Fiduciary / Grievance Officer</strong></p>
            <p>Name: Sayyam</p>
            <p>Email: sayyambtb@gmail.com</p>
            <p>Address: Mumbai, Maharashtra, India</p>
          </div>
          <P>
            Complaints will be acknowledged within 24 hours and resolved within 15 days, in line with the IT
            Rules.
          </P>

          <H2>2. What information we collect</H2>
          <P>We only collect what the App actually needs to function. Specifically:</P>
          <div className="overflow-x-auto -mx-2 mb-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-ink text-left">
                  <th className="px-2 py-2 font-display text-ink">Data</th>
                  <th className="px-2 py-2 font-display text-ink">What it is</th>
                  <th className="px-2 py-2 font-display text-ink">Why we collect it</th>
                </tr>
              </thead>
              <tbody className="text-ink-soft">
                <tr className="border-b border-ink/10">
                  <td className="px-2 py-2 font-semibold text-ink">Device/session identifier</td>
                  <td className="px-2 py-2">An anonymous ID tied to your session, generated automatically</td>
                  <td className="px-2 py-2">To recognize you across visits without requiring signup</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="px-2 py-2 font-semibold text-ink">Handle (username)</td>
                  <td className="px-2 py-2">The name you choose to display</td>
                  <td className="px-2 py-2">Shown on your profile, the leaderboard, and anything you submit</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="px-2 py-2 font-semibold text-ink">Email address</td>
                  <td className="px-2 py-2">Only if you choose to verify your account</td>
                  <td className="px-2 py-2">Required only to unlock Duo/Squad matching with other people; optional for Solo use</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="px-2 py-2 font-semibold text-ink">Photos</td>
                  <td className="px-2 py-2">Proof-of-completion photos you take for a mission or hidden gem visit</td>
                  <td className="px-2 py-2">To verify mission completion and (if you choose) share it on the public feed</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="px-2 py-2 font-semibold text-ink">Mission and gem history</td>
                  <td className="px-2 py-2">Which missions/gems you completed, when, and their text</td>
                  <td className="px-2 py-2">To track your streak, XP, and badges, and to show your activity history</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="px-2 py-2 font-semibold text-ink">Chat messages</td>
                  <td className="px-2 py-2">Messages sent inside a live Duo/Squad mission room</td>
                  <td className="px-2 py-2">To let you coordinate with your match during that mission</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="px-2 py-2 font-semibold text-ink">Neighborhood selection</td>
                  <td className="px-2 py-2">The neighborhood you manually pick in Explore mode</td>
                  <td className="px-2 py-2">To show you a relevant hidden gem — we do not collect your precise GPS location; you choose a neighborhood from a list yourself</td>
                </tr>
                <tr className="border-b border-ink/10">
                  <td className="px-2 py-2 font-semibold text-ink">Content you submit</td>
                  <td className="px-2 py-2">Quest or hidden gem suggestions, with your handle attached</td>
                  <td className="px-2 py-2">To review and potentially publish them for other users</td>
                </tr>
                <tr>
                  <td className="px-2 py-2 font-semibold text-ink">Reports and blocks</td>
                  <td className="px-2 py-2">Reports you file, and users you choose to block</td>
                  <td className="px-2 py-2">For moderation and safety</td>
                </tr>
              </tbody>
            </table>
          </div>
          <P>
            <strong className="text-ink">We do not collect:</strong> your precise real-time location,
            your phone number (unless you separately provide it), payment information, or biometric data.
          </P>

          <H2>3. How we use your information</H2>
          <P>To run the core features of the App (missions, matchmaking, streaks, badges, the feed, Explore).</P>
          <P>To moderate content and enforce our Terms of Service — including reviewing reports, removing content, and suspending accounts that violate our rules.</P>
          <P>To communicate with you about your account, if you've provided an email.</P>
          <P>To improve the App based on aggregated, anonymized usage patterns.</P>
          <P>We do not sell your personal data. We do not use your data for targeted advertising.</P>

          <H2>4. Who we share it with</H2>
          <P><strong className="text-ink">Supabase</strong> (our database and authentication provider) stores your data on our behalf, as a data processor. Supabase's own security practices apply to how this data is stored.</P>
          <P><strong className="text-ink">PostHog</strong> (our analytics provider) receives anonymized usage data — which features you use, whether a mission is completed or abandoned, and your public handle (never your email) — so we can understand how the App is actually used and fix what isn't working. It does not receive your photos, chat messages, or email address.</P>
          <P><strong className="text-ink">Other users</strong> can see your handle, badges, streak, public mission history, and anything you post to the public feed or submit as a quest/gem suggestion. They cannot see your email address.</P>
          <P>We do not sell or rent your data to third parties for marketing.</P>
          <P>We may disclose information if required by law, or to protect the safety of our users (for example, in response to a valid legal request).</P>

          <H2>5. Children's data</H2>
          <P>
            Break The Loop is not intended for children under 18. Certain features — specifically, matchmaking
            with strangers you don't already know (Duo/Squad outside of a direct friend invite) — require you
            to confirm you are 18 or older. If we become aware that we have collected data from a child without
            verifiable parental consent as required under the DPDP Act, we will delete it.
          </P>
          <P>We do not knowingly show behavioral advertising or build tracking profiles of any user under 18.</P>

          <H2>6. How long we keep your data</H2>
          <P>
            We keep your account data for as long as your account is active. If you ask us to delete your
            account, we will delete your personal data within <TODO>[30]</TODO> days, except where we're
            required to retain it (for example, records of a safety report under investigation).
          </P>

          <H2>7. Your rights</H2>
          <P>Under the DPDP Act, you have the right to:</P>
          <ul className="mb-3 list-disc space-y-1 pl-6 text-ink-soft">
            <li><strong className="text-ink">Access</strong> the personal data we hold about you.</li>
            <li><strong className="text-ink">Correct or update</strong> inaccurate data (e.g., your handle).</li>
            <li><strong className="text-ink">Withdraw consent</strong> at any time — you can stop using the App, or ask us to delete your account.</li>
            <li><strong className="text-ink">Erase</strong> your data, subject to the retention exception above.</li>
            <li><strong className="text-ink">File a complaint</strong> with our Grievance Officer (above), and if unresolved, with the Data Protection Board of India.</li>
          </ul>
          <P>To exercise any of these rights, email sayyambtb@gmail.com.</P>

          <H2>8. Data breach notification</H2>
          <P>
            If a data breach occurs that affects your personal data, we will notify the Data Protection Board
            of India without delay and provide affected users with a clear, plain-language notice describing
            what happened and what we're doing about it, consistent with our obligations under the DPDP Rules.
          </P>

          <H2>9. Security</H2>
          <P>
            We rely on Supabase's infrastructure, which includes encryption in transit and at rest, and access
            controls (Row Level Security) restricting who can read or write your data. No system is 100%
            secure, and we cannot guarantee absolute security, but we take reasonable measures appropriate to
            the sensitivity of the data we hold.
          </P>

          <H2>10. Changes to this policy</H2>
          <P>
            We may update this Privacy Policy from time to time. If we make material changes, we'll notify
            users in-app or by email (if provided) before the changes take effect.
          </P>

          <H2>11. Contact</H2>
          <P>Questions about this policy or your data: sayyambtb@gmail.com</P>
        </div>
      </div>
    </main>
  );
}
