"use client";

import React, { useState } from "react";
import { AREAS_SOUTH_TO_NORTH, KIND_LABEL, type Area, type Kind } from "../lib/spots";
import { IBack, ICheck } from "./Icons";

/**
 * Contributing, promoted to a primary action.
 *
 * In the old app this was behind a pencil icon in the footer, under a modal,
 * called "Suggest a Quest" — clearly an afterthought. But the entire defensible
 * asset of this product is that people who live in Mumbai know things about
 * Mumbai that no listings site has. Everything else here is commodity. If that
 * is the asset, adding to it should be one of the four things the navigation
 * offers, and it is.
 *
 * The form asks for the one line rather than a description, because the one
 * line is what makes somebody go, and asking for "a description" reliably
 * produces a paragraph nobody reads.
 */

export default function AddSpot({
  defaultArea,
  onDone,
  onCancel,
}: {
  defaultArea: Area;
  onDone: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [area, setArea] = useState<Area>(defaultArea);
  const [kind, setKind] = useState<Kind>("eat");
  const [line, setLine] = useState("");
  const [sent, setSent] = useState(false);

  const ready = name.trim().length > 1 && line.trim().length > 9;

  if (sent) {
    return (
      <div className="py-10 text-center space-y-4 v2-in">
        <span className="inline-flex w-14 h-14 rounded-full bg-[color:var(--taxi)] text-[color:var(--taxi-ink)] items-center justify-center">
          <ICheck size={26} />
        </span>
        <h1 className="v2-display text-[2rem] leading-tight">In the pile</h1>
        <p className="text-[0.9375rem] leading-relaxed text-[color:var(--paper-dim)] max-w-[22rem] mx-auto text-pretty">
          Someone will check it&apos;s real and then it goes out to everyone, with
          your name on it.
        </p>
        <button onClick={() => onDone(name.trim())} className="v2-btn v2-btn-quiet">
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-4">
      <button onClick={onCancel} className="v2-btn-bare flex items-center gap-1.5">
        <IBack size={16} />
        Back
      </button>

      <div className="space-y-2 v2-in">
        <span className="v2-sign">Add a place</span>
        <h1 className="v2-display text-[2.25rem] leading-tight text-balance">
          What do you know
          <br />
          that we don&apos;t?
        </h1>
        <p className="text-[0.9375rem] leading-relaxed text-[color:var(--paper-dim)] max-w-[24rem] text-pretty">
          Somewhere real, that a person could go to tonight. Not a landmark
          everybody already knows.
        </p>
      </div>

      <div className="space-y-5 v2-in v2-in-2">
        <div className="space-y-2">
          <label className="v2-sign block" htmlFor="v2-spot-name">
            The place
          </label>
          <input
            id="v2-spot-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Name of it"
            className="v2-input"
          />
        </div>

        <div className="space-y-2">
          <label className="v2-sign block" htmlFor="v2-spot-area">
            Where
          </label>
          <select
            id="v2-spot-area"
            value={area}
            onChange={(e) => setArea(e.target.value as Area)}
            className="v2-input"
          >
            {AREAS_SOUTH_TO_NORTH.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <span className="v2-sign block">What you do there</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className="v2-chip"
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="v2-sign block" htmlFor="v2-spot-line">
            One line on why
          </label>
          <textarea
            id="v2-spot-line"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="The thing you'd actually say to a friend to get them to go."
            className="v2-input resize-none leading-relaxed"
          />
          <p className="text-[0.75rem] text-[color:var(--paper-faint)] text-right v2-num">
            {line.length}/200
          </p>
        </div>
      </div>

      <button
        onClick={() => setSent(true)}
        disabled={!ready}
        className="v2-btn v2-btn-primary w-full v2-in v2-in-3"
      >
        Send it in
      </button>
    </div>
  );
}
