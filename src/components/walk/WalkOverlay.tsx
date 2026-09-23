"use client";
import { useEffect, useRef, type ReactNode } from "react";
import AppHeader from "./AppHeader";
export default function WalkOverlay({
  children,
  close,
  label,
  lang,
  open,
  footer,
  scrollKey,
}: {
  children: ReactNode;
  close: () => void;
  label: string;
  lang: string;
  open: boolean;
  footer?: ReactNode;
  scrollKey?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open) dialog?.showModal();
    else dialog?.close();
    return () => dialog?.close();
  }, [open]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const title = ref.current.querySelector("h2");
    if (title) {
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
    ref.current.scrollTop = 0;
  }, [open, scrollKey]);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      className={`walk-screen ${footer ? "walk-screen-with-nav" : ""}`}
      aria-label={label}
      lang={lang}
    >
      <div className="walk-screen-inner">
        <AppHeader />
        <button
          autoFocus
          type="button"
          onClick={close}
          className="button-tertiary my-3 px-0"
        >
          ‹ {label}
        </button>
        {children}
      </div>
      {footer}
    </dialog>
  );
}
