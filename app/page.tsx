import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function LandingPage() {
  const current = await getCurrentUser();

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <p className="font-serif text-2xl tracking-tight">Geodraftly</p>
        <div className="flex gap-3">
          {current ? (
            <Link href="/dashboard" className="rounded-lg bg-field px-4 py-2.5 text-sm font-semibold text-white">
              Open workspace
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink">
                Sign in
              </Link>
              <Link href="/signup" className="rounded-lg bg-field px-4 py-2.5 text-sm font-semibold text-white">
                Start a firm
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass-deep">
          Field operations for engineering and landscape architecture
        </p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.1] tracking-tight text-ink sm:text-6xl">
          Turn every site visit into a complete project record.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-soft">
          Capture existing conditions, photographs, map pins, and punch items in the field — then
          generate a client-ready site observation report before you leave the job.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-lg bg-field px-5 py-3 text-sm font-semibold text-white">
            Create your firm
          </Link>
          <Link href="/login" className="rounded-lg border border-line bg-white px-5 py-3 text-sm font-semibold">
            Sign in to demo
          </Link>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            ["Site visits", "Date, weather, observer, and a running record of what was seen on site."],
            ["Observations & photos", "Categorize conditions, drop a pin, and attach camera photos from a tablet."],
            ["Punch lists & reports", "Assign issues, set due dates, and export a professional PDF the same day."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-line bg-white p-6">
              <h2 className="font-serif text-xl">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
