"use client";

import React, { useEffect, useRef } from "react";

/**
 * The shared shell for every dialog in the app.
 *
 * Each of the ~15 dialogs was a bare `<div>` holding a scrim. That looks right
 * and behaves wrong in four ways that only show up once you stop using a
 * mouse:
 *
 *   - Escape did nothing, so a keyboard user had to tab to the ✕ to get out.
 *   - Nothing carried `role="dialog"`, so assistive tech announced a dialog as
 *     an unlabelled group in the middle of the page.
 *   - The page behind kept scrolling. On a phone that means the scrim scrolls
 *     away under your thumb while a dialog sits on top of it.
 *   - Focus stayed wherever it was and never came back to the control that
 *     opened the dialog once it closed.
 *
 * Dialogs stack (the explorer profile opens on top of the friends list), so
 * the Escape handler is a stack too: only the topmost one responds, and the
 * scroll lock is reference-counted so closing the top dialog doesn't hand the
 * page back its scrollbar while another is still open.
 */

const stack: symbol[] = [];
let lockCount = 0;
let previousOverflow = "";

interface OverlayProps {
  /** Called on Escape and on a click on the scrim itself. Omit for a dialog
   *  that must be answered rather than dismissed. */
  onClose?: () => void;
  /** Announced as the dialog's name. */
  label: string;
  className?: string;
  children: React.ReactNode;
}

export default function Overlay({ onClose, label, className = "", children }: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // onClose is passed as an inline arrow at every call site, so it is a new
  // function on every render. Reading it through a ref keeps the effect below
  // from tearing down and re-running — which would restore focus to the opener
  // after every keystroke typed into the dialog.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const id = Symbol("overlay");
    stack.push(id);

    const opener = document.activeElement as HTMLElement | null;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Only the dialog on top responds, so one Escape closes one dialog.
      if (stack[stack.length - 1] !== id) return;
      closeRef.current?.();
    };
    document.addEventListener("keydown", onKeyDown);

    // Move focus into the dialog so the next Tab lands inside it rather than
    // continuing through the page behind the scrim.
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (firstFocusable ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);

      const i = stack.indexOf(id);
      if (i !== -1) stack.splice(i, 1);

      lockCount -= 1;
      if (lockCount === 0) document.body.style.overflow = previousOverflow;

      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/95 p-4 backdrop-blur-md ${className}`}
      onMouseDown={(e) => {
        // Dismiss only on a press that lands on the scrim itself, so dragging
        // a text selection out of the dialog doesn't close it.
        if (e.target === e.currentTarget) closeRef.current?.();
      }}
    >
      {children}
    </div>
  );
}
