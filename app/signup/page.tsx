import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signupAction } from "@/lib/actions/auth";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8">
        <p className="font-serif text-3xl">Create your Geodraftly Account</p>
        <p className="mt-2 text-sm text-ink-soft">You become the owner. Invite teammates after you sign in.</p>
        <div className="mt-6">
          <AuthForm action={signupAction} mode="signup" />
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-field underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
