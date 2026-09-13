"use client";

import React, { useState, useEffect } from "react";

export interface Quest {
  id: string;
  quest_text: string;
  mode: "solo" | "duo" | "squad";
  rarity?: "common" | "rare" | "legendary";
  xp_reward?: number;
}

export interface GemDetails {
  name: string;
  neighborhood: string;
  description: string;
}

interface MissionCardProps {
  quest: Quest;
  credit?: string | null;
  gem?: GemDetails | null;
  onReroll: () => void;
  onAcceptMission: () => void;
}

export default function SuspenseMissionCard({
  quest,
  credit,
  gem,
  onReroll,
  onAcceptMission,
}: MissionCardProps) {
  const [isRevealing, setIsRevealing] = useState<boolean>(true);
  const [displayText, setDisplayText] = useState<string>("DECRYPTING LOCAL MISSION...");

  const currentRarity = quest.rarity || "common";
  const currentXp = quest.xp_reward || 15;

  // The parent passes `quest` and `gem` as fresh object literals on every
  // render, so depending on them by identity re-ran the whole 1.5s reveal
  // any time anything else on the page changed -- accepting the mission,
  // a toast, a chat message, a roster update -- blurring out the brief the
  // player was mid-way through reading. Depend on the values instead.
  const gemKey = gem ? `${gem.name}|${gem.neighborhood}|${gem.description}` : "";

  useEffect(() => {
    setIsRevealing(true);
    const placeholderPhrases = gemKey
      ? [
          "ASKING AROUND THE NEIGHBORHOOD...",
          "CHECKING WITH THE LOCALS...",
          "DIGGING UP SOMETHING OFF THE MAP...",
          "FINDING A SPOT WORTH KNOWING...",
        ]
      : [
          "SCANNING DADAR & MUMBAI STREETS...",
          "EVALUATING NEIGHBORHOOD SURROUNDINGS...",
          "CALCULATING IRL XP MULTIPLIER...",
          "LOCATING LOCAL REALITY LOOP BREAK...",
        ];

    let intervalCounter = 0;
    const interval = setInterval(() => {
      setDisplayText(placeholderPhrases[intervalCounter % placeholderPhrases.length]);
      intervalCounter++;
    }, 250);

    const revealTimer = setTimeout(() => {
      clearInterval(interval);
      setIsRevealing(false);
      setDisplayText(quest.quest_text);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(revealTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quest.quest_text, quest.rarity, quest.xp_reward, gemKey]);

  // Rarity is the one place the palette is allowed to get loud. Each tier gets
  // a different paper colour and edge treatment so a legendary pull is
  // recognisable from across the room, not just from reading the label.
  const getRarityBadge = () => {
    switch (currentRarity) {
      case "legendary":
        return {
          paper: "bg-gold-wash",
          ribbon: "bg-gold text-ink",
          chip: "bg-ink text-gold",
          label: "⚡ LEGENDARY QUEST",
        };
      case "rare":
        return {
          paper: "bg-rose-wash",
          ribbon: "bg-rose text-white",
          chip: "bg-ink text-rose-wash",
          label: "💎 RARE QUEST",
        };
      default:
        return {
          paper: "bg-white",
          ribbon: "bg-cream-deep text-ink",
          chip: "bg-ink text-cream",
          label: "⚪ COMMON QUEST",
        };
    }
  };

  const style = getRarityBadge();
  const ribbon = gem ? "bg-gold text-ink" : style.ribbon;
  const paper = gem ? "bg-gold-wash" : style.paper;

  return (
    <div className="relative w-full max-w-md">
      {/* The brief itself sits on a rotated backing sheet, so the card reads as
          a physical thing handed to you rather than a panel in a web page. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-2 translate-y-2 rotate-1 rounded-3xl border-2 border-ink bg-cream-deep"
      />

      <div
        className={`relative overflow-hidden rounded-3xl sticker ${paper} transition-all duration-500 ${
          isRevealing ? "scale-[0.97] blur-[2px]" : "scale-100 blur-none"
        }`}
      >
        {/* Rarity ribbon: the loudest band on the card. */}
        <div className={`flex items-center justify-between gap-2 border-b-2 border-ink px-4 py-2.5 ${ribbon}`}>
          <span className="eyebrow truncate">
            {isRevealing
              ? gem
                ? "📍 FINDING A SPOT..."
                : "🎲 ROLLING RARITY..."
              : gem
              ? "📍 HYPER-LOCAL SECRET"
              : style.label}
          </span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 font-display text-[11px] font-bold tracking-tight ${
              gem ? "bg-ink text-gold" : style.chip
            }`}
          >
            +{currentXp} IRL XP
          </span>
        </div>

        <div className="px-5 pb-5 pt-5 sm:px-6">
          {gem && !isRevealing ? (
            <div className="space-y-3">
              <div className="space-y-2 text-center">
                <h3 className="font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">
                  {gem.name}
                </h3>
                <span className="eyebrow inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-cream">
                  <span aria-hidden="true">📍</span>
                  {gem.neighborhood}
                </span>
              </div>
              <p className="rounded-2xl bg-white/80 sticker-flat p-3.5 text-center text-[15px] leading-relaxed text-ink-soft">
                {gem.description}
              </p>
            </div>
          ) : (
            <div className="flex min-h-[104px] items-center justify-center">
              {isRevealing ? (
                <p className="animate-pulse text-center font-mono text-sm font-medium text-muted">
                  {displayText}
                </p>
              ) : (
                <p className="text-center font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
                  <span aria-hidden="true" className="text-ember-deep">
                    “
                  </span>
                  {displayText}
                  <span aria-hidden="true" className="text-ember-deep">
                    ”
                  </span>
                </p>
              )}
            </div>
          )}

          {!isRevealing && credit && (
            <p className="mt-3 text-center text-[11px] font-semibold text-muted">
              {gem ? "Shared by" : "Suggested by"} <span className="text-ember-ink">@{credit}</span>
            </p>
          )}

          {!isRevealing && (
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                onClick={onAcceptMission}
                className="w-full rounded-2xl sticker press bg-ember-deep px-4 py-4 font-display text-base font-bold uppercase tracking-wide text-white"
              >
                {gem ? "I'M GOING — OPEN CAMERA" : "ACCEPT MISSION & OPEN CAMERA"}
              </button>

              <button
                onClick={onReroll}
                className="flex w-full items-center justify-center gap-2 rounded-2xl sticker-sm press-sm bg-white px-4 py-2.5 text-xs font-bold text-ink hover:bg-cream"
              >
                <span>{gem ? "🔄 Show Me Another Spot" : "🔄 Reroll Quest"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
