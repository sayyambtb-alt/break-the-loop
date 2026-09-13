"use client";

import React from "react";
import { KIND_LABEL } from "../lib/spots";
import type { Offer } from "../lib/pick";
import { IPin, IClock, IRupee, IBack, IArrow } from "./Icons";

/**
 * What you get back.
 *
 * Three, not one. The old model assigned you a single dare and let you reroll,
 * which frames the app as an authority handing down a task and you as somebody
 * who either obeys or pulls the lever again. Showing a few real options that
 * all fit the evening you described turns it into a decision you are making.
 * People go out when they chose the thing.
 *
 * Every card has to answer the question a person actually asks before leaving
 * the house: how far, how long, how much, and why this.
 */

export default function Offers({
  offers,
  onPick,
  onMore,
  onBack,
  exhausted,
}: {
  offers: Offer[];
  onPick: (offer: Offer) => void;
  onMore: () => void;
  onBack: () => void;
  exhausted: boolean;
}) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="v2-btn-bare flex items-center gap-1.5">
        <IBack size={16} />
        Change the ask
      </button>

      <h1 className="v2-display text-[2.25rem] sm:text-[2.5rem] text-balance">
        {offers.length === 1 ? "One that fits" : `${offers.length} that fit`}
      </h1>

      <div className="space-y-3">
        {offers.map((offer, i) => (
          <article
            key={offer.spot.id}
            className={`v2-card overflow-hidden v2-in ${i === 1 ? "v2-in-2" : i === 2 ? "v2-in-3" : ""}`}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="v2-sign block mb-1.5">
                    {KIND_LABEL[offer.spot.kind]} · {offer.spot.area}
                  </span>
                  <h2 className="v2-display text-[1.5rem] leading-tight">{offer.spot.name}</h2>
                </div>
                {/* The reason it surfaced, in plain words. The old app never
                    explained itself, so a bad suggestion just looked random. */}
                <span className="shrink-0 text-[0.6875rem] font-semibold px-2 py-1 rounded-full border border-[color:var(--hair-strong)] text-[color:var(--taxi)] whitespace-nowrap">
                  {offer.because}
                </span>
              </div>

              <p className="text-[0.9375rem] leading-relaxed text-[color:var(--paper-dim)] text-pretty">
                {offer.spot.line}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8125rem] text-[color:var(--paper-faint)]">
                <span className="flex items-center gap-1.5">
                  <IPin size={14} />
                  <span className="v2-num">{offer.travel} min</span> away
                </span>
                <span className="flex items-center gap-1.5">
                  <IClock size={14} />
                  <span className="v2-num">{offer.spot.minutes} min</span> there
                </span>
                <span className="flex items-center gap-1.5">
                  <IRupee size={14} />
                  {offer.spot.rupees === 0 ? "Free" : <span className="v2-num">{offer.spot.rupees}</span>}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[color:var(--hair)]">
              {/* Credit is load-bearing. The whole asset is that a person who
                  lives there put this in. */}
              <span className="text-[0.75rem] text-[color:var(--paper-faint)] truncate">
                from @{offer.spot.addedBy}
              </span>
              <button onClick={() => onPick(offer)} className="v2-btn v2-btn-primary !py-2 !px-3.5 !text-[0.875rem]">
                Go here
                <IArrow size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <button onClick={onMore} className="v2-btn v2-btn-quiet w-full">
        {exhausted ? "Start over" : "Something else"}
      </button>
    </div>
  );
}
