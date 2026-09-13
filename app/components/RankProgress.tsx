"use client";

import React, { useEffect, useRef, useState } from "react";
import { getRank } from "../lib/ranks";
import { IconCrown, IconBolt } from "./Icons";

/**
 * The progression bar.
 *
 * Fills from wherever it was last render to the new value, so completing a
 * mission visibly pushes the bar along instead of the number just changing.
 * That small piece of feedback is the entire reason to show a bar rather than
 * a number.
 */
export default function RankProgress({
  totalXp,
  compact = false,
  showXp = true,
}: {
  totalXp: number;
  compact?: boolean;
  /** Off where a stat row beneath already shows the same number. */
  showXp?: boolean;
}) {
  const rank = getRank(totalXp);
  const target = rank.progress * 100;

  // Start at the target on first paint (no fill-up animation on load), then
  // animate on every subsequent change.
  const [width, setWidth] = useState(target);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      setWidth(target);
      return;
    }
    const id = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-1.5 min-w-0">
          <IconCrown size={14} className="text-amber-600 shrink-0" />
          <span className="font-display text-[0.8125rem] font-bold text-stone-900 truncate">
            {rank.current.title}
          </span>
        </span>
        {showXp && (
          <span className="nums text-[0.8125rem] font-bold text-amber-700 shrink-0 flex items-center gap-1">
            <IconBolt size={12} />
            {totalXp.toLocaleString()} XP
          </span>
        )}
      </div>

      <div
        className="h-2 w-full rounded-full bg-stone-200/80 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(target)}
        aria-label={
          rank.next
            ? `${rank.xpToNext} XP until ${rank.next.title}`
            : `Top rank reached: ${rank.current.title}`
        }
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-[width] duration-700 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>

      {!compact && (
        <p className="text-[0.6875rem] text-stone-600 mt-1.5 font-medium">
          {rank.next ? (
            <>
              <span className="nums font-bold text-stone-800">{rank.xpToNext}</span> XP to{" "}
              <span className="font-bold text-stone-800">{rank.next.title}</span>
            </>
          ) : (
            rank.current.blurb
          )}
        </p>
      )}
    </div>
  );
}
