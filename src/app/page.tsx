import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-12">
        {/* Main content */}
        <div className="flex flex-1 flex-col justify-center">
          <div className="text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Lübeck AI Guide
            </p>

            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Explore Lübeck with your personal guide
            </h1>

            <p className="mx-auto mt-5 max-w-sm text-lg leading-7 text-zinc-600">
              Discover stories, history and hidden facts in your language.
            </p>
          </div>

          {/* Language selector */}
          <div className="mt-12">
            <p className="mb-4 text-center text-sm font-semibold">
              Choose your language
            </p>

            <div className="grid grid-cols-4 gap-3">
              <button
                type="button"
                className="h-14 rounded-xl border border-zinc-300 font-medium transition hover:bg-zinc-100"
              >
                DE
              </button>

              <button
                type="button"
                aria-pressed="true"
                className="h-14 rounded-xl bg-black font-medium text-white"
              >
                EN
              </button>

              <button
                type="button"
                className="h-14 rounded-xl border border-zinc-300 font-medium transition hover:bg-zinc-100"
              >
                FR
              </button>

              <button
                type="button"
                className="h-14 rounded-xl border border-zinc-300 font-medium transition hover:bg-zinc-100"
              >
                AR
              </button>
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/lubeck"
            className="mt-8 flex h-16 items-center justify-center rounded-2xl bg-black px-6 text-lg font-semibold text-white transition hover:bg-zinc-800"
          >
            Start Exploring
          </Link>

          <p className="mt-4 text-center text-sm text-zinc-500">
            No account required
          </p>
        </div>

        <footer className="pt-8 text-center text-xs text-zinc-400">
          Your personal guide to Lübeck
        </footer>
      </section>
    </main>
  );
}