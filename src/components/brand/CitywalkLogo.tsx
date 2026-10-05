import type { HTMLAttributes, SVGProps } from "react";

export function CitywalkMark({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path
        d="M32 5.5c-8.2 0-14.8 6.6-14.8 14.8 0 10.6 13 24 14.1 25.1a1 1 0 0 0 1.4 0c1.1-1.1 14.1-14.5 14.1-25.1C46.8 12.1 40.2 5.5 32 5.5Z"
        fill="var(--citywalk-mark-pin, #0B3150)"
      />
      <circle cx="32" cy="20.2" r="6" fill="white" />
      <path
        d="M42.8 39.2c7.1 1.2 11.1 3.7 11.1 6.4 0 4.6-10.8 7.2-19.2 8.4-8.1 1.1-17.8.9-22.3-2.3-3.3-2.4-2.8-5.8.6-8.9 3.5-3.2 9.8-5.6 17.7-7.3"
        stroke="var(--citywalk-mark-route, #12B7B3)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
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
