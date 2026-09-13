"use client";

import React, { useEffect, useState } from "react";
import { Modal, Button } from "./ui";
import { getRank, type RankTier } from "../lib/ranks";
import { IconCrown, IconShare, IconBolt } from "./Icons";

/**
 * Crossing a rank threshold is the single biggest thing that happens in this
 * app — it is the only moment that says the missions added up to something —
 * and it was a four-second toast that shared a slot with "Couldn't save that
 * reaction."
 *
 * The whole point of a rank is the climb, so this shows where you came from,
 * where you landed, and what the tier means, and then gets out of the way.
 */
export default function RankUpModal({
  open,
  fromTier,
  totalXp,
  onClose,
  onShare,
}: {
  open: boolean;
  /** The tier held before this mission, so the jump is legible. */
  fromTier: RankTier | null;
  totalXp: number;
  onClose: () => void;
  onShare?: () => void;
}) {
  const rank = getRank(totalXp);
  // Reset comes from the caller remounting this on each rank-up (see its key),
  // so the effect only ever schedules — it never sets state synchronously.
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!open) return;
    // A beat before the new title lands, so it reads as an arrival rather than
    // appearing pre-loaded.
    const timer = setTimeout(() => setRevealed(true), 260);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} tone="reward" ariaLabel="Rank up">
      <div className="text-center space-y-5">
        <div className="space-y-3">
          <span
            aria-hidden="true"
            className="inline-flex w-16 h-16 rounded-full items-center justify-center bg-[color:var(--reward-bright)] text-stone-900 shadow-[0_4px_0_0_var(--reward)]"
          >
            <IconCrown size={30} />
          </span>

          <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] reward">
            Rank up
          </p>

          {/* Where you were, and where you now are. */}
          <div className="flex items-center justify-center gap-2.5">
            {fromTier && (
              <>
                <span className="font-display text-[0.9375rem] font-semibold ink-3 line-through decoration-1">
                  {fromTier.title}
                </span>
                <span aria-hidden="true" className="ink-3">
                  →
                </span>
              </>
            )}
            <span
              className={`font-display text-xl font-bold ink ${revealed ? "a-pop" : "opacity-0"}`}
            >
              {rank.current.title}
            </span>
          </div>

          <p className="text-[0.875rem] ink-3 leading-relaxed max-w-[16rem] mx-auto">
            {rank.current.blurb}
          </p>
        </div>

        <div className="surface-sunk border bd-line rounded-[1rem] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.06em] ink-3">
              Total XP
            </span>
            <span className="nums flex items-center gap-1 text-[0.9375rem] font-bold reward">
              <IconBolt size={13} />
              {totalXp.toLocaleString()}
            </span>
          </div>
          <p className="text-[0.75rem] ink-3 text-left">
            {rank.next ? (
              <>
                Next up:{" "}
                <span className="font-semibold ink-2">{rank.next.title}</span> at{" "}
                <span className="nums font-semibold ink-2">{rank.next.minXp.toLocaleString()}</span> XP
              </>
            ) : (
              "That is the top rank. Nothing left above you."
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {onShare && (
            <Button variant="reward" size="lg" full onClick={onShare}>
              <IconShare size={16} />
              Share the promotion
            </Button>
          )}
          <Button variant="secondary" full onClick={onClose}>
            Keep going
          </Button>
        </div>
      </div>
    </Modal>
  );
}
