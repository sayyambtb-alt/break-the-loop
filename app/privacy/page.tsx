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
    <span className="bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
      {children}
    </span>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-extrabold text-stone-900 mt-8 mb-3">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-stone-700 leading-relaxed mb-3">{children}</p>;
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_35%,_#FFFCF8_0%,_#FFF8F0_50%,_#FDE9D0_100%)] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-orange-600 font-bold text-sm hover:underline">
          ← Back to Break The Loop
        </Link>

        <div className="bg-gradient-to-b from-white to-stone-50 rounded-3xl shadow-xl shadow-orange-900/10 p-6 sm:p-10 mt-4">
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mb-1">Privacy Policy</h1>
          <p className="text-sm text-stone-500 mb-6">Last updated: <TODO>[DATE]</TODO></p>

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
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm text-stone-700 space-y-1">
            <p><strong>Data Fiduciary / Grievance Officer</strong></p>
            <p>Name: <TODO>[YOUR NAME]</TODO></p>
            <p>Email: <TODO>[GRIEVANCE EMAIL]</TODO></p>
            <p>Address: <TODO>[YOUR ADDRESS OR REGISTERED BUSINESS ADDRESS]</TODO></p>
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
                <tr className="text-left border-b-2 border-stone-200">
                  <th className="py-2 px-2 text-stone-900">Data</th>
                  <th className="py-2 px-2 text-stone-900">What it is</th>
                  <th className="py-2 px-2 text-stone-900">Why we collect it</th>
                </tr>
              </thead>
              <tbody className="text-stone-600">
                <tr className="border-b border-stone-100">
                  <td className="py-2 px-2 font-semibold text-stone-800">Device/session identifier</td>
                  <td className="py-2 px-2">An anonymous ID tied to your session, generated automatically</td>
                  <td className="py-2 px-2">To recognize you across visits without requiring signup</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 px-2 font-semibold text-stone-800">Handle (username)</td>
                  <td className="py-2 px-2">The name you choose to display</td>
                  <td className="py-2 px-2">Shown on your profile, the leaderboard, and anything you submit</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 px-2 font-semibold text-stone-800">Email address</td>
                  <td className="py-2 px-2">Only if you choose to verify your account</td>
                  <td className="py-2 px-2">Required only to unlock Duo/Squad matching with other people; optional for Solo use</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 px-2 font-semibold text-stone-800">Photos</td>
                  <td className="py-2 px-2">Proof-of-completion photos you take for a mission or hidden gem visit</td>
                  <td className="py-2 px-2">To verify mission completion and (if you choose) share it on the public feed</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 px-2 font-semibold text-stone-800">Mission and gem history</td>
                  <td className="py-2 px-2">Which missions/gems you completed, when, and their text</td>
                  <td className="py-2 px-2">To track your streak, XP, and badges, and to show your activity history</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 px-2 font-semibold text-stone-800">Chat messages</td>
                  <td className="py-2 px-2">Messages sent inside a live Duo/Squad mission room</td>
                  <td className="py-2 px-2">To let you coordinate with your match during that mission</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 px-2 font-semibold text-stone-800">Neighborhood selection</td>
                  <td className="py-2 px-2">The neighborhood you manually pick in Explore mode</td>
                  <td className="py-2 px-2">To show you a relevant hidden gem — we do not collect your precise GPS location; you choose a neighborhood from a list yourself</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="py-2 px-2 font-semibold text-stone-800">Content you submit</td>
                  <td className="py-2 px-2">Quest or hidden gem suggestions, with your handle attached</td>
                  <td className="py-2 px-2">To review and potentially publish them for other users</td>
                </tr>
                <tr>
                  <td className="py-2 px-2 font-semibold text-stone-800">Reports and blocks</td>
                  <td className="py-2 px-2">Reports you file, and users you choose to block</td>
                  <td className="py-2 px-2">For moderation and safety</td>
                </tr>
              </tbody>
            </table>
          </div>
          <P>
            <strong className="text-stone-800">We do not collect:</strong> your precise real-time location,
            your phone number (unless you separately provide it), payment information, or biometric data.
          </P>

          <H2>3. How we use your information</H2>
          <P>To run the core features of the App (missions, matchmaking, streaks, badges, the feed, Explore).</P>
          <P>To moderate content and enforce our Terms of Service — including reviewing reports, removing content, and suspending accounts that violate our rules.</P>
          <P>To communicate with you about your account, if you've provided an email.</P>
          <P>To improve the App based on aggregated, anonymized usage patterns.</P>
          <P>We do not sell your personal data. We do not use your data for targeted advertising.</P>

          <H2>4. Who we share it with</H2>
          <P><strong className="text-stone-800">Supabase</strong> (our database and authentication provider) stores your data on our behalf, as a data processor. Supabase's own security practices apply to how this data is stored.</P>
          <P><strong className="text-stone-800">Other users</strong> can see your handle, badges, streak, public mission history, and anything you post to the public feed or submit as a quest/gem suggestion. They cannot see your email address.</P>
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
          <ul className="list-disc pl-6 text-stone-700 space-y-1 mb-3">
            <li><strong className="text-stone-800">Access</strong> the personal data we hold about you.</li>
            <li><strong className="text-stone-800">Correct or update</strong> inaccurate data (e.g., your handle).</li>
            <li><strong className="text-stone-800">Withdraw consent</strong> at any time — you can stop using the App, or ask us to delete your account.</li>
            <li><strong className="text-stone-800">Erase</strong> your data, subject to the retention exception above.</li>
            <li><strong className="text-stone-800">File a complaint</strong> with our Grievance Officer (above), and if unresolved, with the Data Protection Board of India.</li>
          </ul>
          <P>To exercise any of these rights, email <TODO>[GRIEVANCE EMAIL]</TODO>.</P>

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
          <P>Questions about this policy or your data: <TODO>[GRIEVANCE EMAIL]</TODO></P>
        </div>
      </div>
    </main>
  );
}
