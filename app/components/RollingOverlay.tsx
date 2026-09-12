"use client";

import React from "react";

interface RollingOverlayProps {
  caption: string;
  /** Duo/squad waiting-room extras: invite + cancel, shown while a partner is still needed. */
  showWaitingControls?: boolean;
  onInvite?: () => void;
  onCancel?: () => void;
}

export default function RollingOverlay({ caption, showWaitingControls, onInvite, onCancel }: RollingOverlayProps) {
  return (
    <div className="flex flex-col items-center gap-[22px] py-20 animate-btl-rise">
      <div className="relative w-[150px] h-[150px] grid place-items-center">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-ember opacity-50 animate-btl-pulse-fast" />
        <div className="w-24 h-24 rounded-full bg-ember opacity-[0.14]" />
      </div>
      <p className="m-0 font-mono text-xs tracking-[.14em] text-ink-muted text-center uppercase min-h-[34px]">
        {caption}
      </p>
      <div
        className="w-[180px] h-[3px] rounded-sm animate-btl-sweep"
        style={{
          background: "linear-gradient(90deg, rgba(229,81,28,0) 0%, #E5511C 50%, rgba(229,81,28,0) 100%)",
          backgroundSize: "220% 100%",
        }}
      />
      {showWaitingControls && (
        <div className="flex flex-col items-center gap-2 pt-1">
          {onInvite && (
            <button
              onClick={onInvite}
              className="bg-ember text-white text-xs px-4 py-2 rounded-xl font-bold font-display shadow-[0_4px_0_0_#A8360C] transition-all active:shadow-[0_1px_0_0_#A8360C] active:translate-y-[3px]"
            >
              Invite a friend via WhatsApp
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} className="text-[11px] text-ink-muted hover:underline">
              Cancel search
            </button>
          )}
        </div>
      )}
    </div>
  );
}
