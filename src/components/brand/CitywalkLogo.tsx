import type { HTMLAttributes, SVGProps } from "react";

export function CitywalkMark({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 28"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path
        d="m4 19 10-11 12 12L43 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="currentColor" stroke="white" strokeWidth="1.4">
        <circle cx="4" cy="19" r="3.6" />
        <circle cx="14" cy="8" r="3.6" />
        <circle cx="26" cy="20" r="3.6" />
        <circle cx="43" cy="8" r="3.6" />
      </g>
    </svg>
  );
}

type CitywalkLogoProps = Readonly<{
  markOnly?: boolean;
  markClassName?: string;
  wordmarkClassName?: string;
}> & HTMLAttributes<HTMLSpanElement>;

export function CitywalkLogo({
  markOnly = false,
  className,
  markClassName,
  wordmarkClassName,
  ...props
}: CitywalkLogoProps) {
  return (
    <span
      className={className}
      aria-label={markOnly ? "CITYWALK" : undefined}
      {...props}
    >
      <CitywalkMark className={markClassName} />
      {markOnly ? null : (
        <span className={wordmarkClassName}>CITYWALK</span>
      )}
    </span>
  );
}
