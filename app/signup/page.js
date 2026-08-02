"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, inviteCode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to sign up");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-soft dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-1 font-display text-xl font-semibold">Birthday Reminder</h1>
        <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
          Create an account with your invite code.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Email
            </label>
            <input
              required
              autoFocus
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Password
            </label>
            <input
              required
              id="signup-password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="signup-invite" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Invite code
            </label>
            <input
              required
              id="signup-invite"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
