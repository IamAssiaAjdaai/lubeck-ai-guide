"use client";

import { useRef, useState } from "react";
import posthog from "posthog-js";

import type { Locale } from "@/lib/i18n";

type AudioPlayerProps = {
  src: string;
  title: string;
  city: string;
  landmark: string;
  locale: Locale;
  listenLabel: string;
  playLabel: string;
  pauseLabel: string;
  unavailableLabel: string;
};

export default function AudioPlayer({
  src,
  title,
  city,
  landmark,
  locale,
  listenLabel,
  playLabel,
  pauseLabel,
  unavailableLabel,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // باش ما نسجلوش audio_played أكثر من مرة
  const hasTrackedPlay = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);

        if (!hasTrackedPlay.current) {
          posthog.capture("audio_played", {
            city,
            landmark,
            locale,
          });

          hasTrackedPlay.current = true;
        }
      } catch (error) {
        console.error("Audio playback failed:", error);
        setHasError(true);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");

    return `${minutes}:${remainingSeconds}`;
  };

  const progress =
    duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className="rounded-2xl bg-zinc-100 p-5">
        <p className="text-center text-sm text-zinc-500">
          {unavailableLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-zinc-100 p-5">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration)
        }
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onEnded={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={`${isPlaying ? pauseLabel : playLabel} ${title}`}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-xl text-white"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {listenLabel}
          </p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-300">
            <div
              className="h-full bg-black transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
