"use client";

import React, { useCallback, useEffect, useId, useRef } from "react";
import { IconClose } from "./Icons";

/* ---------------------------------------------------------------------------
   Modal

   The app had ~13 hand-rolled dialogs, each repeating the same
   `fixed inset-0 …` markup, and none of them could be closed with Escape,
   none locked background scroll, none returned focus to the control that
   opened them, and none announced themselves to a screen reader. Funnelling
   them all through one component fixes that everywhere at once.
--------------------------------------------------------------------------- */

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  /** Small line under the title. */
  subtitle?: React.ReactNode;
  /** Rendered at the right of the title row, left of the close button. */
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Accessible name for dialogs that carry no visible title. */
  ariaLabel?: string;
  size?: "sm" | "md";
  /** Modals the user must answer (e.g. the safety gate) opt out of dismissal. */
  dismissible?: boolean;
  /** Accent the header — used for the reward/celebration dialogs. */
  tone?: "default" | "reward";
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  action,
  children,
  ariaLabel,
  size = "sm",
  dismissible = true,
  tone = "default",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Callers pass inline arrows for onClose, so `close` changes identity on
  // every render. The effect below must NOT depend on it: re-running its
  // cleanup would restore focus to the opener after every keystroke, making
  // every input in every dialog impossible to type more than one character
  // into. Hold it in a ref and key the effect on `open` alone.
  const close = useCallback(() => {
    if (dismissible && onClose) onClose();
  }, [dismissible, onClose]);

  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  // Escape to close, and keep Tab inside the dialog while it is open.
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Only hand focus back if it is still inside the dialog we're closing —
      // otherwise we'd yank it away from wherever the user has moved on to.
      const active = document.activeElement;
      if (!active || active === document.body || panel?.contains(active)) {
        restoreFocusRef.current?.focus?.();
      }
    };
  }, [open]);

  if (!open) return null;

  // A dialog with no title still needed a close button, and reserving a whole
  // header row for it left a dead band above the content. Float the button
  // instead and let the content start at the top.
  const hasHeaderRow = Boolean(title || subtitle || action);
  const floatingClose = !hasHeaderRow && dismissible;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-[color:var(--scrim)] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        className={`a-pop w-full ${
          size === "md" ? "max-w-md" : "max-w-sm"
        } relative max-h-[88vh] overflow-y-auto scroll-soft surface rounded-[1.5rem] border bd-line shadow-[var(--shadow-modal)] text-left`}
      >
        {floatingClose && (
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="icon-btn !w-8 !h-8 border-transparent bg-transparent absolute top-3 right-3 z-10"
          >
            <IconClose size={17} />
          </button>
        )}

        {hasHeaderRow && (
          <div
            className={`flex items-start justify-between gap-3 px-5 pt-5 pb-3 ${
              tone === "reward" ? "reward-soft rounded-t-[1.5rem]" : ""
            }`}
          >
            <div className="min-w-0">
              {title && (
                <h2
                  id={titleId}
                  className="font-display text-[0.9375rem] font-bold ink leading-tight"
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-[0.8125rem] ink-3 mt-1 leading-snug">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {action}
              {dismissible && (
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="icon-btn !w-8 !h-8 border-transparent bg-transparent"
                >
                  <IconClose size={17} />
                </button>
              )}
            </div>
          </div>
        )}
        <div className={`px-5 pb-5 ${hasHeaderRow ? "" : "pt-5"}`}>{children}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Buttons
--------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "reward" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const SIZES: Record<ButtonSize, string> = {
  sm: "text-[0.8125rem] px-3 py-1.5",
  md: "text-[0.8125rem] px-4 py-2.5",
  lg: "text-[0.9375rem] px-5 py-3.5",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  full,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${SIZES[size]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    />
  );
}

/* ---------------------------------------------------------------------------
   Small display pieces
--------------------------------------------------------------------------- */

/** The uppercase micro-label that heads a section. */
export function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`block text-[0.6875rem] font-bold uppercase tracking-[0.07em] ink-3 ${className}`}
    >
      {children}
    </span>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "action" | "reward";
  className?: string;
}) {
  const tones = {
    neutral: "surface-mute ink-2 bd-line",
    action: "accent-soft accent bd-accent",
    reward: "reward-soft reward bd-reward",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[0.6875rem] font-semibold whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** A labelled number. Used in the profile card and on public profiles. */
export function Stat({
  label,
  value,
  suffix,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "action" | "reward";
}) {
  const valueTone = {
    neutral: "ink",
    action: "accent",
    reward: "reward",
  }[tone];

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className="flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] ink-3">
        {icon}
        {label}
      </span>
      <span className={`nums text-lg font-bold leading-none ${valueTone}`}>
        {value}
        {suffix && <span className="text-[0.6875rem] font-semibold ml-1">{suffix}</span>}
      </span>
    </div>
  );
}

/** Shared text-input styling — inputs were styled six different ways before. */
export const inputClass =
  "w-full surface-sunk border bd-line rounded-[0.625rem] px-3 py-2.5 text-[0.875rem] ink placeholder:text-[color:var(--ink-soft)] focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition";
