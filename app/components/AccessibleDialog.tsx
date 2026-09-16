'use client';

import ToastStack, { type ToastItem } from './ToastStack';
import { useEffect, useRef, type ReactNode } from 'react';

// Native modal dialogs make the rest of the page inert and keep keyboard focus
// inside the overlay. Keep the callback in a ref so typing doesn't reopen it.
export default function AccessibleDialog({ label, onClose, className, children, toasts = [] }: {
  label: string; onClose: () => void; className?: string; children: ReactNode; toasts?: ToastItem[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    if (!dialog) return;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  // Two onboarding dialogs historically shared the same fallback label. When a
  // visible heading is available, use it so assistive tech announces the actual
  // dialog the user is seeing rather than the stale fallback copy.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (label === 'Choose your handle') {
      const heading = dialog.querySelector('h2')?.textContent?.trim();
      dialog.setAttribute('aria-label', heading || label);
    } else {
      dialog.setAttribute('aria-label', label);
    }
  });
  return <dialog ref={dialogRef} aria-label={label} className={`app-dialog ${className || ''}`}
    onCancel={event => { event.preventDefault(); closeRef.current(); }}
    onClick={event => { if (event.target === event.currentTarget) closeRef.current(); }}>
    {toasts.length > 0 && <ToastStack toasts={toasts} />}
    {children}
  </dialog>;
}
