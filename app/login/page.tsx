import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8">
        <p className="font-serif text-3xl">Sign in to Geodraftly</p>
        <p className="mt-2 text-sm text-ink-soft">Use your firm email. Demo: demo@geodraftly.app / demo1234</p>
        {reset === "1" ? (
          <p className="mt-4 rounded-lg border border-line bg-stone-50 px-3 py-2 text-sm text-ink">
            Password updated. Sign in with your new password.
          </p>
        ) : null}
        <div className="mt-6">
          <AuthForm action={loginAction} mode="login" next={next} />
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          New firm?{" "}
          <Link href="/signup" className="font-semibold text-field underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
