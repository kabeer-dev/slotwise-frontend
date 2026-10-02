'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Native <dialog> modal: focus trapping, Escape-to-close and the inert
 * backdrop come from the browser instead of hand-rolled code.
 */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on backdrop
      }}
      aria-labelledby="modal-title"
      className="m-auto w-[min(520px,calc(100vw-24px))] rounded-[var(--radius-panel)] border border-line bg-surface p-0 text-ink shadow-[var(--shadow-panel)] backdrop:bg-ink/35 backdrop:backdrop-blur-[2px]"
    >
      {open ? (
        <div className="max-h-[calc(100dvh-48px)] overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id="modal-title" className="text-xl font-bold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 rounded-lg p-2 text-ink-faint hover:bg-ink/5 hover:text-ink">
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
