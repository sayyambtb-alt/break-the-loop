"use client";

import React, { useEffect, useState } from "react";
import type { Offer } from "../lib/pick";
import { IPin, IArrow } from "./Icons";

/**
 * The screen this whole redesign is for.
 *
 * Once you have picked somewhere, the most useful thing this app can do is
 * shut up. Every other product in this category does the opposite: it keeps
 * you checking in, uploading, reacting, competing — which means the app whose
 * pitch is "stop looking at your phone" is measured by how long you look at
 * your phone.
 *
 * So: no feed, no timer counting down at you, no points ticking up, nothing
 * to refresh. One line telling you where you are going, one link to get you
 * there, and an instruction to put the thing in your pocket. The minutes count
 * up quietly because that is the only number worth keeping, and you do not
 * have to look at it.
 *
 * The old app required a photo before it would let you complete a mission,
 * which forces the phone back out at exactly the moment you are supposed to be
 * somewhere. Here the photo is optional, private by default, and asked for
 * afterwards.
 */

function elapsed(sinceIso: string): { mins: number; label: string } {
  const ms = Date.now() - new Date(sinceIso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 1) return { mins, label: "just left" };
  if (mins < 60) return { mins, label: `${mins} min out` };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return { mins, label: m ? `${h}h ${m}m out` : `${h}h out` };
}

export default function OutMode({
  offer,
  since,
  onBack,
}: {
  offer: Offer;
  since: string;
  onBack: (minutes: number) => void;
}) {
  const [tick, setTick] = useState(() => elapsed(since));

  useEffect(() => {
    // Once a minute. There is nothing here worth re-rendering faster, and a
    // second-by-second counter would be its own reason to keep watching.
    const id = setInterval(() => setTick(elapsed(since)), 20000);
    return () => clearInterval(id);
  }, [since]);

  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${offer.spot.name}, ${offer.spot.area}, Mumbai`
  )}`;

  return (
    <div className="min-h-[calc(100dvh-3rem)] flex flex-col justify-between gap-10 py-4">
      <div className="space-y-8 v2-in">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--taxi)] v2-breathe" aria-hidden="true" />
          <span className="v2-sign">You&apos;re out</span>
          <span className="v2-sign ml-auto v2-num" aria-live="polite">
            {tick.label}
          </span>
        </div>

        <div className="space-y-3">
          <span className="v2-sign">{offer.spot.area}</span>
          <h1 className="v2-display text-[3rem] sm:text-[3.5rem] leading-[1.02] text-balance">
            {offer.spot.name}
          </h1>
          <p className="text-[1.0625rem] leading-relaxed text-[color:var(--paper-dim)] text-pretty max-w-[26rem]">
            {offer.spot.line}
          </p>
        </div>

        <a
          href={maps}
          target="_blank"
          rel="noopener noreferrer"
          className="v2-btn v2-btn-quiet inline-flex"
        >
          <IPin size={16} />
          Directions
        </a>
      </div>

      <div className="space-y-6">
        {/* The instruction. It is the product. */}
        <p className="v2-display text-[1.75rem] leading-snug text-[color:var(--paper-faint)] text-balance">
          Now put your phone away.
        </p>

        <button onClick={() => onBack(tick.mins)} className="v2-btn v2-btn-primary w-full">
          I&apos;m back
          <IArrow size={17} />
        </button>
      </div>
    </div>
  );
}
