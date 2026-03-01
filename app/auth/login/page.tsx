import Link from "next/link";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="max-w-md w-full glass-elevated p-8 rounded-2xl">
        <h1 className="text-2xl font-bold text-center text-white mb-2">designermeow</h1>
        <h2 className="text-lg font-medium text-center text-zinc-400 mb-6">Sign In</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        <LoginForm />

        <p className="text-center text-sm text-zinc-500 mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-violet-400 hover:text-violet-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
