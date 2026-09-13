"use client";

import React, { useEffect, useRef, useState } from "react";
import { IconCamera, IconRefresh, IconBolt, IconPin, IconSparkle, IconGem } from "./Icons";

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
  /**
   * Rendered inside the active-mission panel, which is itself a card. Drops
   * the outer border and shadow so it reads as a section of that panel rather
   * than a card floating inside another card. The rarity tint stays, since
   * that is what makes a legendary pull feel different.
   */
  nested?: boolean;
}

const RARITY = {
  legendary: {
    label: "LEGENDARY QUEST",
    shell: "bd-reward bg-gradient-to-b from-amber-50 via-white to-amber-50/40",
    glow: "shadow-[0_2px_4px_rgba(180,83,9,0.1),0_16px_40px_rgba(245,158,11,0.28)]",
    text: "reward",
    icon: IconSparkle,
  },
  rare: {
    label: "RARE QUEST",
    shell: "bd-reward bg-gradient-to-b from-amber-50/70 to-white",
    glow: "shadow-[0_2px_4px_rgba(180,83,9,0.06),0_12px_32px_rgba(245,158,11,0.16)]",
    text: "reward",
    icon: IconGem,
  },
  common: {
    label: "COMMON QUEST",
    shell: "bd-line surface",
    glow: "shadow-[0_1px_2px_rgba(68,64,60,0.04),0_8px_24px_rgba(68,64,60,0.08)]",
    text: "ink-3",
    icon: IconBolt,
  },
} as const;

export default function SuspenseMissionCard({
  quest,
  credit,
  gem,
  onReroll,
  onAcceptMission,
  nested = false,
}: MissionCardProps) {
  const [isRevealing, setIsRevealing] = useState<boolean>(true);
  const [displayText, setDisplayText] = useState<string>("DECRYPTING LOCAL MISSION...");
  const acceptRef = useRef<HTMLButtonElement>(null);

  const currentRarity = quest.rarity || "common";
  const currentXp = quest.xp_reward || 15;
  const style = RARITY[currentRarity];
  const RarityIcon = style.icon;

  useEffect(() => {
    setIsRevealing(true);
    const placeholderPhrases = gem
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
  }, [quest, gem]);

  // Once the mission lands, put focus on the accept button. Keyboard users
  // previously had to tab back through the whole page to reach it.
  useEffect(() => {
    if (!isRevealing) acceptRef.current?.focus({ preventScroll: true });
  }, [isRevealing]);

  return (
    <div
      className={`relative w-full max-w-md rounded-[1.5rem] overflow-hidden transition-all duration-500 ${
        nested
          ? currentRarity === "common"
            ? "bg-transparent"
            : `${style.shell} border`
          : `${style.shell} ${style.glow} border`
      } ${isRevealing ? "scale-[0.97]" : "scale-100"}`}
      aria-busy={isRevealing}
    >
      {/* The shimmer only runs while the mission is being "decrypted". */}
      {isRevealing && (
        <div aria-hidden="true" className="absolute inset-0 a-sweep pointer-events-none" />
      )}

      <div className={`relative ${nested ? "p-0" : "p-5 sm:p-6"}`}>
        <div className="flex items-center justify-between gap-3 mb-5">
          <span
            className={`flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-[0.1em] uppercase ${
              gem ? "reward" : style.text
            }`}
          >
            {gem ? <IconPin size={14} /> : <RarityIcon size={14} />}
            {isRevealing
              ? gem
                ? "FINDING A SPOT..."
                : "ROLLING RARITY..."
              : gem
              ? "HYPER-LOCAL SECRET"
              : style.label}
          </span>

          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full reward-soft border bd-reward reward">
            <IconBolt size={12} />
            <span className="nums text-[0.6875rem] font-bold">+{currentXp} IRL XP</span>
          </span>
        </div>

        {gem && !isRevealing ? (
          <div className="my-5 space-y-3 a-rise">
            <div className="text-center space-y-2">
              <h3 className="font-display text-2xl font-bold ink leading-tight text-balance">
                {gem.name}
              </h3>
              <span className="inline-flex items-center gap-1 text-[0.6875rem] font-bold uppercase tracking-[0.06em] reward reward-soft border bd-reward px-2.5 py-1 rounded-full">
                <IconPin size={11} />
                {gem.neighborhood}
              </span>
            </div>
            <p className="text-center text-[0.875rem] ink-2 leading-relaxed text-pretty">
              {gem.description}
            </p>
          </div>
        ) : (
          <div className="min-h-[104px] flex items-center justify-center my-5">
            <p
              className={
                isRevealing
                  ? "text-center font-mono text-[0.8125rem] ink-3 tracking-tight"
                  : "a-rise text-center font-display text-xl sm:text-[1.375rem] font-medium leading-snug ink text-balance"
              }
            >
              {isRevealing ? displayText : `"${displayText}"`}
            </p>
          </div>
        )}

        {!isRevealing && credit && (
          <p className="text-center text-[0.6875rem] ink-3 -mt-2 mb-3">
            {gem ? "Shared by" : "Suggested by"}{" "}
            <span className="font-semibold ink-2">@{credit}</span>
          </p>
        )}

        {!isRevealing && (
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              ref={acceptRef}
              type="button"
              onClick={onAcceptMission}
              className="btn btn-primary text-[0.875rem] py-3.5 px-4 w-full"
            >
              <IconCamera size={17} />
              <span>{gem ? "I'M GOING — OPEN CAMERA" : "ACCEPT MISSION & OPEN CAMERA"}</span>
            </button>

            <button
              type="button"
              onClick={onReroll}
              className="btn btn-ghost text-[0.8125rem] py-2.5 px-4 w-full"
            >
              <IconRefresh size={15} />
              <span>{gem ? "Show Me Another Spot" : "Reroll Quest"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
