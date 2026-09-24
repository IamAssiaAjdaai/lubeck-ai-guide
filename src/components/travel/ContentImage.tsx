"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { MapPin } from "lucide-react";

// A failed editorial image must not leave a broken-image glyph in a city or
// place card. Changing the source starts a fresh attempt without an effect.
export default function ContentImage(props: ImageProps) {
  const source = typeof props.src === "string" ? props.src : JSON.stringify(props.src);
  return <ImageAttempt key={source} {...props} />;
}

function ImageAttempt({ alt, onError, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="absolute inset-0 flex items-center justify-center bg-accent-soft text-primary"
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={!alt}
      >
        <MapPin size={30} aria-hidden="true" />
      </span>
    );
  }
  return <Image {...props} alt={alt} onError={(event) => {
    setFailed(true);
    onError?.(event);
  }} />;
}
