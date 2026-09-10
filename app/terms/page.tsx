import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Break The Loop",
  description: "The rules for using Break The Loop, including important safety information about meeting people in person.",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-extrabold text-stone-900 mt-8 mb-3">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-stone-700 leading-relaxed mb-3">{children}</p>;
}

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_35%,_#FFFCF8_0%,_#FFF8F0_50%,_#FDE9D0_100%)] px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-orange-600 font-bold text-sm hover:underline">
          ← Back to Break The Loop
        </Link>

        <div className="bg-gradient-to-b from-white to-stone-50 rounded-3xl shadow-xl shadow-orange-900/10 p-6 sm:p-10 mt-4">
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mb-1">Terms of Service</h1>
          <p className="text-sm text-stone-500 mb-6">Last updated: September 10, 2026</p>

          <P>
            Please read these Terms carefully. They include a liability waiver relevant to meeting other users
            in person, which is a core part of how Break The Loop works. By using the App, you agree to these
            Terms.
          </P>

          <H2>1. What Break The Loop is</H2>
          <P>
            Break The Loop ("the App") gives you random real-world missions to complete alone, with one other
            person ("Duo"), or with a group ("Squad") — including, at your choice, people you've never met
            before. It also has an "Explore" mode that surfaces hyper-local spots submitted by other users.
          </P>
          <P>
            <strong className="text-stone-800">
              The App is a tool for suggesting activities and, where you opt into Duo/Squad, connecting you
              with other users. Break The Loop does not supervise, screen in advance, or guarantee the safety
              of any in-person meeting that results from using the App.
            </strong>
          </P>

          <H2>2. Eligibility</H2>
          <ul className="list-disc pl-6 text-stone-700 space-y-1 mb-3">
            <li>You must be at least 13 years old to create an account.</li>
            <li>
              You must be at least <strong className="text-stone-800">18 years old</strong> to use Duo or Squad
              matching with people you don't already know (i.e., random/stranger matchmaking, as opposed to
              inviting a specific friend via a direct link).
            </li>
            <li>
              By confirming your age at the relevant point in the App, you represent that this is true.
              Misrepresenting your age is a violation of these Terms.
            </li>
          </ul>

          <div className="border-2 border-orange-300 bg-orange-50 rounded-2xl p-5 my-6">
            <H2>3. Meeting people in person — read this section</H2>
            <P>
              Duo and Squad modes may match you with a stranger for a real-world activity. This is inherently
              different from a normal app feature, and it comes with real risk. By using Duo or Squad, you
              acknowledge and agree to the following:
            </P>
            <ul className="list-disc pl-6 text-stone-700 space-y-2 mb-3">
              <li>
                <strong className="text-stone-800">
                  Break The Loop does not conduct background checks, identity verification, or any vetting of
                  users
                </strong>{" "}
                beyond what's described elsewhere in these Terms (e.g., our reporting and banning system, which
                is reactive, not preventive).
              </li>
              <li>
                <strong className="text-stone-800">You are solely responsible for your own safety</strong> when
                meeting anyone through the App. We strongly recommend you:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Only ever meet in a public place.</li>
                  <li>Tell a friend or family member where you're going, who you're meeting, and when you expect to be back.</li>
                  <li>Trust your instincts — if something feels wrong, leave.</li>
                  <li>Never share financial information, home address, or other sensitive personal details with someone you've just matched with.</li>
                  <li>Do not feel obligated to complete a mission or stay in a match if you feel unsafe.</li>
                </ul>
              </li>
              <li>
                <strong className="text-stone-800">You assume all risk</strong> arising from meeting or
                interacting with other users, in person or otherwise. To the fullest extent permitted by law,
                Break The Loop, its founders, and anyone helping build or operate it disclaim all liability for
                any injury, loss, dispute, or harm arising from an in-person meeting arranged through the App,
                whether or not we were negligent in operating the platform.
              </li>
              <li>
                <strong className="text-stone-800">Report immediately</strong> anything that violates these
                Terms or makes you feel unsafe, using the in-app report feature. In an emergency, contact local
                emergency services first — the App is not an emergency response tool.
              </li>
            </ul>
          </div>

          <H2>4. Your conduct</H2>
          <P>You agree not to:</P>
          <ul className="list-disc pl-6 text-stone-700 space-y-1 mb-3">
            <li>Harass, threaten, stalk, or endanger any other user.</li>
            <li>Impersonate another person or misrepresent your identity, age, or intentions.</li>
            <li>Use the App to solicit money, sell goods or services, or run scams.</li>
            <li>Post content that is illegal, sexually explicit involving minors (which we will report to relevant authorities), hateful, or that violates someone else's rights.</li>
            <li>Attempt to circumvent a ban or a block placed by another user.</li>
            <li>Use bots, scripts, or automated means to interact with the App.</li>
          </ul>
          <P>
            We reserve the right to remove content, suspend, or permanently ban any account that violates these
            Terms, at our discretion, with or without notice.
          </P>

          <H2>5. Content you submit</H2>
          <P>When you submit a mission suggestion, a hidden gem, a chat message, or a photo:</P>
          <ul className="list-disc pl-6 text-stone-700 space-y-1 mb-3">
            <li>You confirm you have the right to submit it (e.g., it's your own photo, your own words).</li>
            <li>You grant Break The Loop a non-exclusive, royalty-free license to display it within the App (e.g., on the feed, or to other users completing the same hidden gem).</li>
            <li>You're responsible for what you post. We moderate reactively (via user reports and admin review) but do not pre-screen every submission before it appears.</li>
            <li>We may edit or remove your submission at our discretion — for example, to fix a factual error in a hidden gem's location, or because it violates these Terms.</li>
          </ul>

          <H2>6. Reporting, blocking, and bans</H2>
          <ul className="list-disc pl-6 text-stone-700 space-y-1 mb-3">
            <li>Any user can report content or another user, and can personally block another user from ever being matched with them again.</li>
            <li>We review reports and may remove content, issue warnings, or ban accounts that violate these Terms.</li>
            <li>Reports are reviewed by us, not guaranteed to result in any specific action, and we are not obligated to share the outcome of an investigation with the reporting user.</li>
          </ul>

          <H2>7. Accounts</H2>
          <ul className="list-disc pl-6 text-stone-700 space-y-1 mb-3">
            <li>You can use much of the App as a guest, without an account.</li>
            <li>Verifying your email unlocks Duo/Squad matching with people outside your direct invite links.</li>
            <li>You're responsible for keeping your own account/session secure.</li>
            <li>We may suspend or terminate your account at any time for violating these Terms.</li>
          </ul>

          <H2>8. No warranty</H2>
          <P>
            The App is provided "as is." We do not guarantee it will be available at all times, free of bugs,
            or that any mission, hidden gem, or match will be accurate, safe, or as described. Hidden gems are
            submitted by users and reflect their personal knowledge — we do not independently verify every
            submission's accuracy or that the location still exists as described.
          </P>

          <H2>9. Limitation of liability</H2>
          <P>
            To the maximum extent permitted by law, Break The Loop and anyone involved in building or operating
            it will not be liable for any indirect, incidental, or consequential damages arising from your use
            of the App, including but not limited to harm arising from in-person meetings, content posted by
            other users, or any interruption or error in the service.
          </P>

          <H2>10. Governing law and disputes</H2>
          <P>
            These Terms are governed by the laws of India. Any dispute arising from these Terms or your use of
            the App will be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.
          </P>

          <H2>11. Changes to these Terms</H2>
          <P>
            We may update these Terms from time to time. Continued use of the App after changes take effect
            means you accept the updated Terms.
          </P>

          <H2>12. Contact</H2>
          <P>Questions about these Terms, or to file a complaint: sayyambtb@gmail.com</P>
        </div>
      </div>
    </main>
  );
}
