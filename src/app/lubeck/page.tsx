import Link from "next/link";
import { landmarks } from "@/data/landmarks";

export default function LubeckPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto w-full max-w-md px-6 py-10">
        {/* Header */}
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 hover:text-black"
          >
            ← Back
          </Link>

          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Discover Lübeck
          </h1>

          <p className="mt-2 text-zinc-600">
            5 historic places to explore
          </p>
        </div>

        {/* Tour CTA */}
        <div className="mt-8 rounded-2xl bg-zinc-100 p-5">
          <p className="text-sm font-medium text-zinc-500">
            Walking Tour
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            Explore Lübeck’s historic center
          </h2>

          <p className="mt-2 text-sm text-zinc-600">
            ~45 min • 5 stops
          </p>

          <Link
            href="/lubeck/holstentor"
            className="mt-5 flex h-14 items-center justify-center rounded-xl bg-black font-semibold text-white transition hover:bg-zinc-800"
          >
            Start Walking Tour
          </Link>
        </div>

        {/* Landmarks */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Places</h2>

          <div className="mt-4 flex flex-col gap-4">
            {landmarks.map((landmark) => (
              <Link
                key={landmark.slug}
                href={`/lubeck/${landmark.slug}`}
                className="flex items-center gap-4 rounded-2xl border border-zinc-200 p-3 transition hover:bg-zinc-50"
              >
                {/* Image placeholder */}
                <div className="h-20 w-20 shrink-0 rounded-xl bg-zinc-200" />

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{landmark.name}</h3>

                  <p className="mt-1 text-sm text-zinc-500">
                    🎧 {landmark.duration} audio
                  </p>
                </div>

                <span className="text-xl text-zinc-400">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}