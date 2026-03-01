export function LoginForm({ redirect }: { redirect?: string }) {
  return (
    <form action="/api/auth/login" method="post">
      {redirect && (
        <input type="hidden" name="redirect" value={redirect} />
      )}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-400 mb-1"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-400 mb-1"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90 transition-opacity"
        >
          Sign In
        </button>
      </div>
    </form>
  );
}
