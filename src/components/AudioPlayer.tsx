"use client";

import { useRef, useState } from "react";
import { Headphones, Pause, Play } from "lucide-react";
import posthog from "posthog-js";

import { formatTime } from "@/lib/formatTime";
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

function captureAudioPlayed(properties: Record<string, string>) {
  try {
    posthog.capture("audio_played", properties);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Audio analytics could not be captured:", error);
    }
  }
}

export default function AudioPlayer({ src, title, city, landmark, locale, listenLabel, playLabel, pauseLabel, unavailableLabel }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
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
          captureAudioPlayed({ city, landmark, locale });
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

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-4 text-text-secondary">
        <Headphones aria-hidden="true" size={20} strokeWidth={1.8} className="shrink-0" />
        <p className="text-sm leading-6">{unavailableLabel}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-blue-100 bg-blue-50/60 p-4">
      <audio ref={audioRef} src={src} preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onPause={() => setIsPlaying(false)} onPlay={() => setIsPlaying(true)} onEnded={() => setIsPlaying(false)} onError={() => setHasError(true)} />
      <div className="flex items-center gap-4">
        <button type="button" onClick={togglePlay} aria-label={`${isPlaying ? pauseLabel : playLabel} ${title}`} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_20px_rgb(37_99_235_/_0.28)] transition hover:bg-blue-700">
          {isPlaying ? <Pause aria-hidden="true" size={20} fill="currentColor" strokeWidth={1.8} /> : <Play aria-hidden="true" size={20} fill="currentColor" strokeWidth={1.8} className="ms-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{listenLabel}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs tabular-nums text-text-secondary">
            <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
