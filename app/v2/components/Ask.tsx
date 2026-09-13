"use client";

import React from "react";
import { AREAS_SOUTH_TO_NORTH, KIND_LABEL, type Area, type Kind } from "../lib/spots";
import {
  BUDGET_LABEL,
  countMatches,
  describeContext,
  type Ask as AskShape,
  type Budget,
  type Context,
} from "../lib/pick";
import { IArrow, IRain, IWalk, ITrain, IUsers, ISun, IMoon } from "./Icons";

/**
 * The home screen.
 *
 * What it replaces: a 224px round button reading DESTROY BOREDOM that rolled a
 * rarity and handed you one dare, with a reroll. That is a lever attached to a
 * variable reward — the exact mechanism of the habit this product says it is
 * rescuing you from. It also could not tell you anything useful, because it
 * knew nothing about your evening.
 *
 * This asks the two questions that actually decide whether a person leaves the
 * house — how long have you got, and will you travel — and everything else it
 * can work out for itself from the clock and the calendar.
 */

const BUDGET_SUB: Record<Budget, string> = {
  quick: "Round the corner and back",
  hour: "Enough to go somewhere",
  evening: "Properly out",
};

export default function Ask({
  ask,
  ctx,
  onChange,
  onContext,
  onSubmit,
  visited,
}: {
  ask: AskShape;
  ctx: Context;
  onChange: (next: AskShape) => void;
  onContext: (next: Context) => void;
  onSubmit: () => void;
  visited: Set<string>;
}) {
  const matches = countMatches(ask, ctx, visited);
  const set = (patch: Partial<AskShape>) => onChange({ ...ask, ...patch });

  const toggleKind = (k: Kind) =>
    set({
      kinds: ask.kinds.includes(k) ? ask.kinds.filter((x) => x !== k) : [...ask.kinds, k],
    });

  return (
    <div className="space-y-8">
      {/* The app knows what time it is. The old one never did, and handed out
          the same dare at 2am on a wet Tuesday as at 6pm on a Saturday. */}
      <div className="v2-in flex items-center gap-2">
        <span className="text-[color:var(--taxi)]">
          {ctx.raining ? <IRain size={16} /> : ctx.hour >= 19 || ctx.hour < 6 ? <IMoon size={16} /> : <ISun size={16} />}
        </span>
        <span className="v2-sign">{describeContext(ctx)}</span>
        <button
          onClick={() => onContext({ ...ctx, raining: !ctx.raining })}
          aria-pressed={ctx.raining}
          className="v2-btn-bare ml-auto !text-[0.75rem]"
          title="Tell the app it's raining"
        >
          {ctx.raining ? "It stopped" : "It's raining"}
        </button>
      </div>

      <div className="v2-in v2-in-2 space-y-5">
        <h1 className="v2-display text-[2.75rem] sm:text-[3.25rem] text-balance">
          How long have
          <br />
          you got?
        </h1>

        <div className="grid gap-2">
          {(["quick", "hour", "evening"] as Budget[]).map((b) => (
            <button
              key={b}
              onClick={() => set({ budget: b })}
              aria-pressed={ask.budget === b}
              className="v2-choice"
            >
              <span className="text-[0.9375rem] font-semibold">{BUDGET_LABEL[b]}</span>
              <span className="v2-choice-sub">{BUDGET_SUB[b]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="v2-in v2-in-3 space-y-5">
        <div className="space-y-2.5">
          <span className="v2-sign">Getting there</span>
          <div className="flex gap-2">
            <button
              onClick={() => set({ travel: "foot" })}
              aria-pressed={ask.travel === "foot"}
              className="v2-chip"
            >
              <IWalk size={15} />
              On foot
            </button>
            <button
              onClick={() => set({ travel: "any" })}
              aria-pressed={ask.travel === "any"}
              className="v2-chip"
            >
              <ITrain size={15} />
              I&apos;ll travel
            </button>
            <button
              onClick={() => set({ withSomeone: !ask.withSomeone })}
              aria-pressed={ask.withSomeone}
              className="v2-chip ml-auto"
            >
              <IUsers size={15} />
              With someone
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="v2-sign">Starting from</span>
            {ask.kinds.length > 0 && (
              <button onClick={() => set({ kinds: [] })} className="v2-btn-bare !text-[0.75rem]">
                Clear filters
              </button>
            )}
          </div>
          <select
            value={ask.from}
            onChange={(e) => set({ from: e.target.value as Area })}
            className="v2-input"
            aria-label="Your neighbourhood"
          >
            {AREAS_SOUTH_TO_NORTH.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2.5">
          <span className="v2-sign">In the mood for</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => toggleKind(k)}
                aria-pressed={ask.kinds.includes(k)}
                className="v2-chip"
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="v2-in v2-in-3 space-y-2 pt-1">
        <button onClick={onSubmit} disabled={matches === 0} className="v2-btn v2-btn-primary w-full">
          Show me
          <IArrow size={17} />
        </button>
        {/* Honest about how much it actually has, rather than always producing
            something and hoping you don't notice it's a bad fit. */}
        <p className="text-center text-[0.8125rem] text-[color:var(--paper-faint)]">
          {matches === 0
            ? "Nothing fits that right now. Loosen something."
            : `${matches} ${matches === 1 ? "place" : "places"} fit that`}
        </p>
      </div>
    </div>
  );
}
