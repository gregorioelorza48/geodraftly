import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8">
        <p className="font-serif text-3xl">Reset your password</p>
        <p className="mt-2 text-sm text-ink-soft">
          Enter the email on your account. We will show a reset link until email delivery is configured.
        </p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-sm text-ink-soft">
          Remember it?{" "}
          <Link href="/login" className="font-semibold text-field underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
