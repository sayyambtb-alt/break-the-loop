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

  const getRarityBadge = () => {
    switch (currentRarity) {
      case "legendary":
        return {
          border: "border-amber-400",
          bg: "bg-gradient-to-b from-amber-50 to-white",
          shadow: "shadow-xl shadow-amber-400/40",
          text: "text-amber-700",
          label: "⚡ LEGENDARY QUEST",
        };
      case "rare":
        return {
          border: "border-amber-400",
          bg: "bg-gradient-to-b from-amber-50 to-white",
          shadow: "shadow-lg shadow-amber-400/25",
          text: "text-amber-700",
          label: "💎 RARE QUEST",
        };
      default:
        return {
          border: "border-stone-300",
          bg: "bg-gradient-to-b from-white to-stone-50",
          shadow: "shadow-lg shadow-stone-500/10",
          text: "text-stone-600",
          label: "⚪ COMMON QUEST",
        };
    }
  };

  const style = getRarityBadge();

  return (
    <div
      className={`relative w-full max-w-md p-6 rounded-2xl border ${style.border} ${style.bg} ${style.shadow} transition-all duration-500 transform ${
        isRevealing ? "scale-95 blur-xs" : "scale-100 blur-none"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-black tracking-widest uppercase ${gem ? "text-amber-700" : style.text}`}>
          {isRevealing
            ? gem
              ? "📍 FINDING A SPOT..."
              : "🎲 ROLLING RARITY..."
            : gem
            ? "📍 HYPER-LOCAL SECRET"
            : style.label}
        </span>
        <div className="px-3 py-1 rounded-full bg-stone-100 border border-stone-300 text-xs font-bold text-amber-700">
          +{currentXp} IRL XP
        </div>
      </div>

      {gem && !isRevealing ? (
        <div className="my-4 space-y-3">
          <div className="text-center space-y-1.5">
            <h3 className="text-xl font-black text-stone-900 leading-tight">{gem.name}</h3>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
              {gem.neighborhood}
            </span>
          </div>
          <p className="text-center text-sm text-stone-700 leading-relaxed">
            {gem.description}
          </p>
        </div>
      ) : (
        <div className="min-h-[100px] flex items-center justify-center my-4">
          <p
            className={`text-center text-lg font-medium leading-relaxed ${
              isRevealing ? "text-stone-500 animate-pulse font-mono text-sm" : "text-stone-900"
            }`}
          >
            "{displayText}"
          </p>
        </div>
      )}

      {!isRevealing && credit && (
        <p className="text-center text-[10px] text-stone-500 -mt-2 mb-2">
          {gem ? "Shared by" : "Suggested by"} @{credit}
        </p>
      )}

      {!isRevealing && (
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onAcceptMission}
            className="w-full py-3.5 px-4 rounded-xl font-extrabold text-white bg-orange-600 hover:bg-orange-500 active:scale-98 transition-all shadow-lg shadow-orange-600/30"
          >
            {gem ? "I'M GOING — OPEN CAMERA" : "ACCEPT MISSION & OPEN CAMERA"}
          </button>

          <button
            onClick={onReroll}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100/60 hover:bg-stone-100 border border-stone-300/50 transition-all flex items-center justify-center gap-2"
          >
            <span>{gem ? "🔄 Show Me Another Spot" : "🔄 Reroll Quest"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
