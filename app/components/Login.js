"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-bg">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-[0_10px_30px_rgba(138,106,75,0.12)]"
      >
        <div className="mb-6 rounded-xl bg-accent-soft p-3 text-center">
          <h1 className="text-lg font-semibold text-primary-strong">Kids expense tracker</h1>
          <p className="text-sm text-muted">Sign in to continue</p>
        </div>

        <label className="block text-sm text-text mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-border rounded-md px-3 py-2 mb-4 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <label className="block text-sm text-text mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-border rounded-md px-3 py-2 mb-4 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
        />

        {error && <p className="text-sm text-error-strong mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-strong disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-xs text-muted mt-4">
          Users are created in Supabase Dashboard -&gt; Authentication -&gt; Users.
          Add yourself and your wife there — no public sign-up form exists.
        </p>
      </form>
    </div>
  );
}
