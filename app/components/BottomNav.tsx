"use client";

import React from "react";

export type BtlTab = "tonight" | "explore" | "feed" | "you";

const TABS: { id: BtlTab; label: string }[] = [
  { id: "tonight", label: "Tonight" },
  { id: "explore", label: "Explore" },
  { id: "feed", label: "Proof" },
  { id: "you", label: "You" },
];

interface BottomNavProps {
  active: BtlTab;
  onSelect: (tab: BtlTab) => void;
}

export default function BottomNav({ active, onSelect }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-hairline bg-paper/96 backdrop-blur-sm"
      style={{ paddingTop: 10, paddingBottom: "max(22px, env(safe-area-inset-bottom))", paddingLeft: 8, paddingRight: 8 }}
    >
      {TABS.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="flex-1 flex flex-col items-center gap-[7px] py-2"
          >
            <span
              className={`font-display font-bold text-[13px] tracking-[-0.01em] ${
                isActive ? "text-ember" : "text-ink-muted"
              }`}
            >
              {t.label}
            </span>
            <span
              className={`w-[18px] h-[3px] rounded-full ${isActive ? "bg-ember" : "bg-transparent"}`}
            />
          </button>
        );
      })}
    </nav>
  );
}
