"use client";

import React, { useState } from "react";
import type { Offer } from "../lib/pick";
import { ICheck, IEye } from "./Icons";

/**
 * What happens when you get back.
 *
 * The old flow gated completion on a photo upload, then pushed that photo into
 * a public feed with reaction counters. Two problems: it makes you pull the
 * phone out mid-experience to satisfy the app, and it turns going outside into
 * something you perform for an audience. Performance is the thing that makes
 * social apps exhausting.
 *
 * So the note is optional, the photo is optional, and both are private unless
 * you explicitly decide otherwise. Sharing is off by default and has to be
 * switched on — the reverse of every app that does this.
 */

export default function BackFrom({
  offer,
  minutes,
  onSave,
  onSkip,
}: {
  offer: Offer;
  minutes: number;
  onSave: (note: string, shared: boolean) => void;
  onSkip: () => void;
}) {
  const [note, setNote] = useState("");
  const [shared, setShared] = useState(false);

  return (
    <div className="space-y-7 py-4">
      <div className="space-y-3 v2-in">
        <span className="v2-sign flex items-center gap-2">
          <ICheck size={15} className="text-[color:var(--taxi)]" />
          Back from
        </span>
        <h1 className="v2-display text-[2.5rem] leading-tight text-balance">{offer.spot.name}</h1>
        <p className="text-[0.9375rem] text-[color:var(--paper-faint)]">
          {offer.spot.area} · <span className="v2-num">{minutes}</span> minutes out
        </p>
      </div>

      <div className="space-y-3 v2-in v2-in-2">
        <label className="v2-sign block" htmlFor="v2-note">
          Anything worth remembering?
        </label>
        <textarea
          id="v2-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={400}
          placeholder="Optional. Nobody sees this but you."
          className="v2-input resize-none leading-relaxed"
        />

        <button
          onClick={() => setShared((s) => !s)}
          aria-pressed={shared}
          className="v2-chip"
        >
          <IEye size={15} />
          {shared ? "Friends can see this" : "Only you can see this"}
        </button>
      </div>

      <div className="space-y-2 v2-in v2-in-3">
        <button onClick={() => onSave(note.trim(), shared)} className="v2-btn v2-btn-primary w-full">
          Save to my log
        </button>
        <button onClick={onSkip} className="v2-btn-bare w-full">
          Don&apos;t log it
        </button>
      </div>
    </div>
  );
}
