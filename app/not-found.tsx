import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <h1 className="font-serif text-3xl">Page not found</h1>
      <Link href="/dashboard" className="text-sm font-semibold text-field underline">
        Back to dashboard
      </Link>
    </div>
  );
}
