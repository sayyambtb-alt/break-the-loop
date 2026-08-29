"use client";

import React, { useState, useEffect } from "react";

export interface Quest {
  id: string;
  quest_text: string;
  mode: "solo" | "duo" | "squad";
  rarity?: "common" | "rare" | "legendary";
  xp_reward?: number;
}

interface MissionCardProps {
  quest: Quest;
  credit?: string | null;
  onReroll: () => void;
  onAcceptMission: () => void;
}

export default function SuspenseMissionCard({
  quest,
  credit,
  onReroll,
  onAcceptMission,
}: MissionCardProps) {
  const [isRevealing, setIsRevealing] = useState<boolean>(true);
  const [displayText, setDisplayText] = useState<string>("DECRYPTING LOCAL MISSION...");

  const currentRarity = quest.rarity || "common";
  const currentXp = quest.xp_reward || 15;

  useEffect(() => {
    setIsRevealing(true);
    const placeholderPhrases = [
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
  }, [quest]);

  const getRarityBadge = () => {
    switch (currentRarity) {
      case "legendary":
        return {
          border: "border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)]",
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          label: "⚡ LEGENDARY QUEST",
        };
      case "rare":
        return {
          border: "border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]",
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          label: "💎 RARE QUEST",
        };
      default:
        return {
          border: "border-[#3a2438]",
          bg: "bg-[#241726]/80",
          text: "text-slate-400",
          label: "⚪ COMMON QUEST",
        };
    }
  };

  const style = getRarityBadge();

  return (
    <div
      className={`relative w-full max-w-md p-6 rounded-2xl border ${style.border} ${style.bg} backdrop-blur-xl transition-all duration-500 transform ${
        isRevealing ? "scale-95 blur-xs" : "scale-100 blur-none"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-black tracking-widest uppercase ${style.text}`}>
          {isRevealing ? "🎲 ROLLING RARITY..." : style.label}
        </span>
        <div className="px-3 py-1 rounded-full bg-[#2e1c2c] border border-[#3a2438] text-xs font-bold text-amber-400">
          +{currentXp} IRL XP
        </div>
      </div>

      <div className="min-h-[100px] flex items-center justify-center my-4">
        <p
          className={`text-center text-lg font-medium leading-relaxed ${
            isRevealing ? "text-slate-500 animate-pulse font-mono text-sm" : "text-white"
          }`}
        >
          "{displayText}"
        </p>
      </div>

      {!isRevealing && credit && (
        <p className="text-center text-[10px] text-slate-500 -mt-2 mb-2">
          Suggested by @{credit}
        </p>
      )}

      {!isRevealing && (
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={onAcceptMission}
            className="w-full py-3.5 px-4 rounded-xl font-extrabold text-white bg-rose-600 hover:bg-rose-500 active:scale-98 transition-all shadow-lg shadow-rose-600/30"
          >
            ACCEPT MISSION & OPEN CAMERA
          </button>

          <button
            onClick={onReroll}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-[#2e1c2c]/60 hover:bg-[#2e1c2c] border border-[#3a2438]/50 transition-all flex items-center justify-center gap-2"
          >
            <span>🔄 Reroll Quest</span>
          </button>
        </div>
      )}
    </div>
  );
}
