"use client";

import { useRef, useState } from "react";

type AudioPlayerProps = {
  src: string;
  title: string;
};

export default function AudioPlayer({
  src,
  title,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) {
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
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={`${isPlaying ? "Pause" : "Play"} ${title}`}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-xl text-white"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <div className="min-w-0 flex-1">
          <p className="font-semibold">Listen to the story</p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-300">
            <div
              className="h-full bg-black"
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