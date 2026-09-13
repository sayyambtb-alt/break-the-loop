"use client";

import React from "react";
import { AREAS_SOUTH_TO_NORTH } from "../lib/spots";
import { areasVisited, stats, type V2State } from "../lib/store";
import { IEye, IArrow } from "./Icons";

/**
 * What replaces XP, ranks, badges and streaks.
 *
 * Those four mechanics are the core of the current app and I think they are
 * the single biggest thing wrong with it. A product whose stated purpose is
 * breaking a compulsion loop should not run on points, levels, unlockables and
 * a streak you lose. That is the same machinery as the feed it is rescuing you
 * from, pointed at a different behaviour. The streak is the worst of them:
 * it manufactures guilt, and the day you break it is usually the day you stop
 * using the app entirely.
 *
 * The honest reward for going somewhere is having gone. So the artifact is a
 * record, not a score:
 *
 *  - A ladder of Mumbai, south to north, filling in as you cover the city.
 *    The city is a long thin island; a vertical line is its actual shape, and
 *    it makes "where haven't I been" a visible, pullable question.
 *  - Your own journal underneath, private by default.
 *  - Numbers that cannot be farmed and never go down if you skip a month.
 */

export default function Log({
  state,
  onStart,
}: {
  state: V2State;
  onStart: () => void;
}) {
  const been = areasVisited(state);
  const s = stats(state);
  const entries = [...state.log].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="space-y-8 pb-4">
      <div className="space-y-2 v2-in">
        <span className="v2-sign">Your Mumbai</span>
        <h1 className="v2-display text-[2.5rem] leading-tight">
          {been.size} of {AREAS_SOUTH_TO_NORTH.length} neighbourhoods
        </h1>
      </div>

      {/* The ladder. No levels, no tiers, nothing to grind — just the shape of
          the city and where you have actually been. */}
      <div className="relative pl-0 v2-in v2-in-2">
        <div className="v2-ladder-rail" aria-hidden="true" />
        <ul className="space-y-0">
          {AREAS_SOUTH_TO_NORTH.map((area) => {
            const visits = state.log.filter((e) => e.area === area).length;
            const hasBeen = been.has(area);
            return (
              <li key={area} className="flex items-center gap-3 py-1.5">
                <span className="v2-ladder-dot" data-been={hasBeen} aria-hidden="true" />
                <span
                  className={`text-[0.9375rem] ${
                    hasBeen ? "text-[color:var(--paper)] font-medium" : "text-[color:var(--paper-faint)]"
                  }`}
                >
                  {area}
                </span>
                {visits > 0 && (
                  <span className="v2-num ml-auto text-[0.75rem] text-[color:var(--paper-faint)]">
                    {visits}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <span className="sr-only">
          {been.size} of {AREAS_SOUTH_TO_NORTH.length} neighbourhoods visited, listed south to north.
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-[color:var(--hair)] border border-[color:var(--hair)] rounded-[10px] overflow-hidden v2-in v2-in-3">
        {[
          { n: s.outs, l: s.outs === 1 ? "time out" : "times out" },
          { n: s.places, l: s.places === 1 ? "place" : "places" },
          { n: s.timeLabel.n, l: s.timeLabel.unit },
        ].map((stat) => (
          <div key={stat.l} className="bg-[color:var(--ink-raised)] px-3 py-4 text-center">
            <p className="v2-num v2-display text-[1.75rem] leading-none">{stat.n}</p>
            <p className="text-[0.75rem] text-[color:var(--paper-faint)] mt-1.5">{stat.l}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <span className="v2-sign">The log</span>

        {entries.length === 0 ? (
          <div className="v2-card p-5 text-center space-y-3">
            <p className="text-[0.9375rem] text-[color:var(--paper-dim)] leading-relaxed max-w-[22rem] mx-auto">
              Nothing here yet. This fills up on its own — you don&apos;t have to keep a
              streak alive, and it never goes down.
            </p>
            <button onClick={onStart} className="v2-btn v2-btn-primary">
              Find somewhere
              <IArrow size={16} />
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="v2-card p-4 space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="v2-display text-[1.25rem] leading-tight min-w-0">{e.spotName}</h3>
                  <span className="v2-num shrink-0 text-[0.75rem] text-[color:var(--paper-faint)]">
                    {new Date(e.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                </div>
                <p className="text-[0.8125rem] text-[color:var(--paper-faint)]">
                  {e.area} · <span className="v2-num">{e.minutes}</span> min out
                  {e.shared && (
                    <span className="inline-flex items-center gap-1 ml-2 text-[color:var(--sea)]">
                      <IEye size={12} />
                      shared
                    </span>
                  )}
                </p>
                {e.note && (
                  <p className="text-[0.9375rem] leading-relaxed text-[color:var(--paper-dim)] border-l border-[color:var(--hair-strong)] pl-3 text-pretty">
                    {e.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
