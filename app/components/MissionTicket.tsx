"use client";

import React, { useRef } from "react";

export interface GemDetails {
  name: string;
  neighborhood: string;
  description: string;
}

export type Rarity = "common" | "rare" | "legendary";

const RARITY_COLOR: Record<Rarity, string> = {
  common: "#17140F",
  rare: "#E5511C",
  legendary: "#BF1D63",
};

const EXPIRED_GREY = "#7D7366";

interface MissionTicketProps {
  questText: string;
  rarity: Rarity;
  xp: number;
  modeLabel: string;
  credit?: string | null;
  gem?: GemDetails | null;
  expired: boolean;
  clockLabel: string;
  timerPct: number;
  proofImage: string | null;
  uploading: boolean;
  rerollsLeft: number;
  onImageSelected: (file: File) => void;
  onComplete: () => void;
  onReroll: () => void;
  onAbandon: () => void;
  onExpiredReset: () => void;
}

export default function MissionTicket({
  questText,
  rarity,
  xp,
  modeLabel,
  credit,
  gem,
  expired,
  clockLabel,
  timerPct,
  proofImage,
  uploading,
  rerollsLeft,
  onImageSelected,
  onComplete,
  onReroll,
  onAbandon,
  onExpiredReset,
}: MissionTicketProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rarityColor = expired ? EXPIRED_GREY : RARITY_COLOR[rarity];

  return (
    <div className="animate-btl-rise pt-2.5">
      <div
        className="relative bg-card border border-hairline rounded-[20px] overflow-hidden"
        style={{ boxShadow: "0 18px 40px -28px rgba(23,20,15,.5)" }}
      >
        <div className="h-[5px]" style={{ background: rarityColor }} />

        <div className="px-[18px] pt-[18px] pb-4">
          <div className="flex justify-between items-center">
            <span
              className="font-mono text-[11px] font-bold tracking-[.16em]"
              style={{ color: rarityColor }}
            >
              {expired ? "EXPIRED" : rarity.toUpperCase()}
            </span>
            <span className="font-mono text-[11px] font-bold tracking-[.08em] bg-paper-deep border border-hairline px-[9px] py-1 rounded-full text-ink">
              +{xp} XP
            </span>
          </div>

          {gem ? (
            <div className="mt-3.5 space-y-2">
              <h3 className="m-0 font-display font-extrabold text-[22px] tracking-[-0.02em] text-ink leading-tight">
                {gem.name}
              </h3>
              <span className="inline-block font-mono text-[10px] font-bold tracking-[.14em] text-legendary uppercase">
                {gem.neighborhood}
              </span>
              <p className="m-0 text-sm leading-[1.5] text-ink-body">{gem.description}</p>
            </div>
          ) : (
            <p
              className="mt-3.5 mb-0 font-display font-bold text-[23px] leading-[1.22] tracking-[-0.015em] text-ink"
              style={{ textWrap: "pretty" as any }}
            >
              {questText}
            </p>
          )}

          {credit && (
            <p className="mt-2 mb-0 text-[11px] text-ink-muted">
              {gem ? "Shared by" : "Suggested by"} @{credit}
            </p>
          )}

          <div className="flex gap-3.5 mt-3.5 text-xs text-ink-muted font-medium">
            <span>{modeLabel}</span>
          </div>
        </div>

        {/* Perforation */}
        <div className="relative h-5">
          <div className="absolute top-[9px] left-4 right-4 border-t-2 border-dashed border-hairline" />
          <div className="absolute top-0 -left-[11px] w-5 h-5 rounded-full bg-paper border border-hairline" />
          <div className="absolute top-0 -right-[11px] w-5 h-5 rounded-full bg-paper border border-hairline" />
        </div>

        <div className="px-[18px] pt-1 pb-[18px]">
          {expired ? (
            <p className="m-0 text-sm font-semibold" style={{ color: EXPIRED_GREY }}>
              Time's up on this one — no XP, streak untouched.
            </p>
          ) : (
            <>
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-[28px] font-bold tracking-[-0.02em] text-ink">
                  {clockLabel}
                </span>
                <span className="text-xs text-ink-muted font-medium">left to log proof</span>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-paper-deep overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                  style={{ width: `${timerPct}%`, background: rarityColor }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {!expired && proofImage && (
        <div className="mt-3 rounded-2xl overflow-hidden border border-hairline">
          <img src={proofImage} alt="Proof" className="w-full h-[150px] object-cover" />
        </div>
      )}

      {!expired && !proofImage && uploading && (
        <div className="mt-3 rounded-2xl border border-hairline bg-paper-deep h-[150px] flex flex-col items-center justify-center gap-1">
          <span className="animate-spin text-xl">☁️</span>
          <span className="font-mono text-[11px] tracking-[.08em] text-ink-muted">uploading proof…</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageSelected(file);
        }}
        className="hidden"
      />

      <div className="flex flex-col gap-2 mt-3.5">
        {expired ? (
          <button
            onClick={onExpiredReset}
            className="w-full py-[17px] rounded-2xl font-display font-extrabold text-[17px] text-white"
            style={{ background: EXPIRED_GREY }}
          >
            Expired — roll again
          </button>
        ) : (
          <>
            <button
              onClick={() => (proofImage ? onComplete() : fileInputRef.current?.click())}
              disabled={uploading}
              className="w-full py-[17px] rounded-2xl font-display font-extrabold text-[17px] transition-transform active:scale-[0.98] disabled:opacity-60"
              style={{
                background: proofImage ? "#E5511C" : "#17140F",
                color: proofImage ? "#fff" : "#F7F4EE",
                boxShadow: proofImage ? "0 5px 0 0 #A8360C" : "0 5px 0 0 #000",
              }}
            >
              {proofImage ? "Log it — loop broken" : "Capture proof"}
            </button>
            <div className="flex gap-2">
              <button
                onClick={onReroll}
                disabled={rerollsLeft < 1}
                className="flex-1 text-center py-[13px] rounded-[14px] border border-hairline bg-card text-[13px] font-semibold text-ink disabled:opacity-50"
              >
                {rerollsLeft > 0 ? "Reroll (1)" : "No rerolls"}
              </button>
              <button
                onClick={onAbandon}
                className="flex-1 text-center py-[13px] rounded-[14px] border border-hairline bg-card text-[13px] font-semibold text-ink-muted"
              >
                Drop it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
