"use client";

import type { AriaRole, MouseEvent, ReactNode } from "react";

export function ConfirmSubmitButton({
  children,
  confirmation,
  className,
  role,
}: Readonly<{
  children: ReactNode;
  confirmation: string;
  className?: string;
  role?: AriaRole;
}>) {
  function confirmSubmission(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmation)) event.preventDefault();
  }

  return (
    <button
      className={className}
      onClick={confirmSubmission}
      role={role}
      type="submit"
    >
      {children}
    </button>
  );
}
