"use client";

import { LocateFixed } from "lucide-react";

import type { UserLocationStatus } from "@/lib/geolocation";

import styles from "./CityMap.module.css";

type MapLocationControlProps = Readonly<{
  status: UserLocationStatus;
  label: string;
  onActivate: () => void;
}>;

export default function MapLocationControl({
  status,
  label,
  onActivate,
}: MapLocationControlProps) {
  const isRequesting = status === "requesting";
  const isUnavailable = status === "unsupported";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-busy={isRequesting}
      disabled={isRequesting || isUnavailable}
      data-location-status={status}
      onClick={onActivate}
      className={`${styles.locationControl} ${
        status === "available" ? styles.locationControlActive : ""
      }`}
    >
      <LocateFixed aria-hidden="true" size={21} strokeWidth={2} />
    </button>
  );
}
