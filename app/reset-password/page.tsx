import Link from "next/link";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = Boolean(token && token.length >= 16);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8">
        <p className="font-serif text-3xl">Choose a new password</p>
        <p className="mt-2 text-sm text-ink-soft">Use at least 8 characters. The reset link works once and expires in an hour.</p>
        <div className="mt-6">
          {valid && token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="rounded-lg border border-line bg-stone-50 px-3 py-2 text-sm text-ink">
              This reset link is missing or invalid.{" "}
              <Link href="/forgot-password" className="font-semibold text-field underline">
                Request a new one
              </Link>
              .
            </p>
          )}
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          <Link href="/login" className="font-semibold text-field underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
