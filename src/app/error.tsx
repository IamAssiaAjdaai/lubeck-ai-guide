"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="app-shell" lang="en">
      <section className="content-container py-16">
        <h1 className="text-2xl font-bold">CITYWALK is temporarily unavailable</h1>
        <p className="my-5 text-text-secondary">We couldn’t load this content. Please try again in a moment.</p>
        <button className="button-primary" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
