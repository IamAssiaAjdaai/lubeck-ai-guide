"use client";

import type { MouseEvent } from "react";

export function ConfirmSubmitButton({
  children,
  confirmation,
  className,
}: Readonly<{
  children: string;
  confirmation: string;
  className?: string;
}>) {
  function confirmSubmission(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmation)) event.preventDefault();
  }

  return (
    <button
      className={className}
      onClick={confirmSubmission}
      type="submit"
    >
      {children}
    </button>
  );
}
