"use client";

import React, { useState } from "react";
import { SPOTS, type Area } from "../lib/spots";
import { ISend, IArrow, IUsers } from "./Icons";

/**
 * What replaces the community feed.
 *
 * The old feed was photo cards with fire and high-five counters. That is an
 * engagement metric, and an engagement metric turns going outside into content
 * production: you start choosing the mission that photographs well and
 * checking what your post did. An app about getting off your phone should not
 * be issuing scores for how well you performed being off your phone.
 *
 * What is genuinely useful about other people here is two things, and the
 * counters are neither:
 *
 *  1. Somebody to go with. Having arranged to meet a person is by a distance
 *     the strongest reason anyone actually leaves the house. So the primary
 *     action is a single tap that asks one friend if they are free — not a
 *     lobby, a queue, a room code or a live chat.
 *  2. Where people you trust have been. Shown as a quiet list with no numbers
 *     attached, and only for the entries that person chose to share.
 */

interface Friend {
  handle: string;
  area: Area;
  free: boolean;
}

const FRIENDS: Friend[] = [
  { handle: "priya_w", area: "Bandra", free: true },
  { handle: "imran", area: "Byculla", free: true },
  { handle: "devika", area: "Fort", free: false },
  { handle: "ganesh_m", area: "Matunga", free: false },
];

const RECENT: { handle: string; spotId: string; when: string }[] = [
  { handle: "imran", spotId: "sarvi", when: "last night" },
  { handle: "devika", spotId: "bhau-daji", when: "Sunday" },
  { handle: "priya_w", spotId: "banganga", when: "last week" },
];

export default function People({ onGoTo }: { onGoTo: (spotId: string) => void }) {
  const [asked, setAsked] = useState<string[]>([]);

  return (
    <div className="space-y-8 pb-4">
      <div className="space-y-2 v2-in">
        <span className="v2-sign">People</span>
        <h1 className="v2-display text-[2.5rem] leading-tight text-balance">
          Ask someone
          <br />
          if they&apos;re free
        </h1>
        <p className="text-[0.9375rem] leading-relaxed text-[color:var(--paper-dim)] max-w-[24rem] text-pretty">
          One tap. No room codes, no lobby, no waiting in a queue. They get a
          message asking if they&apos;re out in the next hour.
        </p>
      </div>

      <ul className="space-y-2 v2-in v2-in-2">
        {FRIENDS.map((f) => {
          const done = asked.includes(f.handle);
          return (
            <li key={f.handle} className="v2-card p-3.5 flex items-center gap-3">
              <span
                className="w-8 h-8 rounded-full border border-[color:var(--hair-strong)] flex items-center justify-center text-[color:var(--paper-faint)] shrink-0"
                aria-hidden="true"
              >
                <IUsers size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-medium truncate">@{f.handle}</p>
                <p className="text-[0.75rem] text-[color:var(--paper-faint)]">
                  {f.area}
                  {f.free && <span className="text-[color:var(--sea)]"> · around tonight</span>}
                </p>
              </div>
              <button
                onClick={() => setAsked((a) => [...a, f.handle])}
                disabled={done}
                className={`v2-btn ${done ? "v2-btn-quiet" : "v2-btn-primary"} !py-2 !px-3 !text-[0.8125rem] ml-auto shrink-0`}
              >
                {done ? "Asked" : <><ISend size={14} />Ask</>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-3">
        <span className="v2-sign">Where they&apos;ve been</span>
        {/* No counts, no reactions, no ranking. Just where somebody went and a
            way to go yourself. */}
        <ul className="space-y-2">
          {RECENT.map((r) => {
            const spot = SPOTS.find((s) => s.id === r.spotId);
            if (!spot) return null;
            return (
              <li key={r.spotId} className="v2-card p-4 space-y-2">
                <p className="text-[0.8125rem] text-[color:var(--paper-faint)]">
                  @{r.handle} · {r.when}
                </p>
                <h3 className="v2-display text-[1.25rem] leading-tight">{spot.name}</h3>
                <p className="text-[0.875rem] leading-relaxed text-[color:var(--paper-dim)] text-pretty">
                  {spot.line}
                </p>
                <button
                  onClick={() => onGoTo(spot.id)}
                  className="v2-btn v2-btn-quiet !py-1.5 !px-3 !text-[0.8125rem]"
                >
                  Go too
                  <IArrow size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
