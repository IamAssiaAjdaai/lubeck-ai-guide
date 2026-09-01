import Link from "next/link";
import { notFound } from "next/navigation";
import { landmarks } from "@/data/landmarks";

type LandmarkPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return landmarks.map((landmark) => ({
    slug: landmark.slug,
  }));
}

export default async function LandmarkPage({
  params,
}: LandmarkPageProps) {
  const { slug } = await params;

  const currentIndex = landmarks.findIndex(
    (landmark) => landmark.slug === slug
  );

  if (currentIndex === -1) {
    notFound();
  }

  const landmark = landmarks[currentIndex];
  const nextLandmark = landmarks[currentIndex + 1];

  const progress = ((currentIndex + 1) / landmarks.length) * 100;

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto w-full max-w-md px-6 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/lubeck"
            className="text-sm font-medium text-zinc-500 hover:text-black"
          >
            ← Back
          </Link>

          <span className="text-sm text-zinc-500">
            Stop {currentIndex + 1} of {landmarks.length}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-black"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Image placeholder */}
        <div className="mt-6 aspect-[4/3] w-full rounded-3xl bg-zinc-200" />

        {/* Header */}
        <div className="mt-6">
          <p className="text-sm font-medium text-zinc-500">
            🎧 Audio guide • {landmark.duration}
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {landmark.name}
          </h1>

          <p className="mt-2 leading-7 text-zinc-600">
            {landmark.description}
          </p>
        </div>

        {/* Audio */}
        <div className="mt-8 rounded-2xl bg-zinc-100 p-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label={`Play ${landmark.name} audio guide`}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-xl text-white"
            >
              ▶
            </button>

            <div className="min-w-0 flex-1">
              <p className="font-semibold">Listen to the story</p>

              <div className="mt-3 h-1.5 rounded-full bg-zinc-300" />

              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>0:00</span>
                <span>{landmark.duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Story */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">The Story</h2>

          <p className="mt-3 leading-7 text-zinc-700">
            {landmark.story}
          </p>
        </section>

        {/* Facts */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Quick Facts</h2>

          <div className="mt-4 space-y-3">
            {landmark.facts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-xl border border-zinc-200 p-4"
              >
                <p className="text-sm text-zinc-500">{fact.label}</p>
                <p className="mt-1 font-semibold">{fact.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AI */}
        <button
          type="button"
          className="mt-10 flex h-14 w-full items-center justify-center rounded-xl border border-black font-semibold transition hover:bg-zinc-50"
        >
          Ask your AI Guide
        </button>

        {/* Next */}
        {nextLandmark ? (
          <Link
            href={`/lubeck/${nextLandmark.slug}`}
            className="mt-4 flex h-16 w-full items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white transition hover:bg-zinc-800"
          >
            Next Stop →
          </Link>
        ) : (
          <Link
            href="/lubeck"
            className="mt-4 flex h-16 w-full items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white"
          >
            Finish Tour ✓
          </Link>
        )}
      </section>
    </main>
  );
}