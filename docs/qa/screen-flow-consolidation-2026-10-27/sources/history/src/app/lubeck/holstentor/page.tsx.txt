import Link from "next/link";

export default function HolstentorPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto w-full max-w-md px-6 py-8">
        {/* Top navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/lubeck"
            className="text-sm font-medium text-zinc-500 hover:text-black"
          >
            ← Back
          </Link>

          <span className="text-sm text-zinc-500">Stop 1 of 5</span>
        </div>

        {/* Tour progress */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full w-1/5 rounded-full bg-black" />
        </div>

        {/* Image placeholder */}
        <div className="mt-6 aspect-[4/3] w-full rounded-3xl bg-zinc-200" />

        {/* Landmark heading */}
        <div className="mt-6">
          <p className="text-sm font-medium text-zinc-500">
            🎧 Audio guide • 2 min
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Holstentor
          </h1>

          <p className="mt-2 text-zinc-600">
            One of Lübeck&apos;s most famous landmarks and a symbol of the
            city&apos;s Hanseatic history.
          </p>
        </div>

        {/* Audio player mockup */}
        <div className="mt-8 rounded-2xl bg-zinc-100 p-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Play audio guide"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-xl text-white"
            >
              ▶
            </button>

            <div className="min-w-0 flex-1">
              <p className="font-semibold">Listen to the story</p>

              <div className="mt-3 h-1.5 rounded-full bg-zinc-300">
                <div className="h-full w-0 rounded-full bg-black" />
              </div>

              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>0:00</span>
                <span>2:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Story */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">The Story</h2>

          <p className="mt-3 leading-7 text-zinc-700">
            The Holstentor was built in the late 15th century as part of
            Lübeck&apos;s city fortifications. Its two large towers and
            distinctive brick Gothic architecture became a lasting symbol of
            the city&apos;s wealth and importance during the Hanseatic era.
          </p>
        </section>

        {/* Quick facts */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Quick Facts</h2>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-sm text-zinc-500">Built</p>
              <p className="mt-1 font-semibold">Late 15th century</p>
            </div>

            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-sm text-zinc-500">Architecture</p>
              <p className="mt-1 font-semibold">Brick Gothic</p>
            </div>

            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="text-sm text-zinc-500">Known for</p>
              <p className="mt-1 font-semibold">
                Symbol of Lübeck and the Hanseatic League
              </p>
            </div>
          </div>
        </section>

        {/* AI Guide */}
        <button
          type="button"
          className="mt-10 flex h-14 w-full items-center justify-center rounded-xl border border-black font-semibold transition hover:bg-zinc-50"
        >
          Ask your AI Guide
        </button>

        {/* Next stop */}
        <Link
          href="/lubeck/marienkirche"
          className="mt-4 flex h-16 w-full items-center justify-center rounded-2xl bg-black text-lg font-semibold text-white transition hover:bg-zinc-800"
        >
          Next Stop →
        </Link>
      </section>
    </main>
  );
}