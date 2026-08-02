"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20";

function AccountStep({ onCreated }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, inviteCode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to sign up");
      }
      onCreated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 font-display text-xl font-semibold">Birthday Reminder</h1>
      <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
        Step 1 of 2 — create an account with your invite code.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="signup-username" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Username
          </label>
          <input
            required
            autoFocus
            id="signup-username"
            type="text"
            minLength={3}
            maxLength={32}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
          <label htmlFor="signup-confirm-password" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Confirm password
          </label>
          <input
            required
            id="signup-confirm-password"
            type="password"
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {submitting ? "Creating account…" : "Continue"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Log in
        </a>
      </p>
    </>
  );
}

function TelegramStep() {
  const [chatId, setChatId] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/me/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramChatId: chatId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to send code");
      setCodeSent(true);
      setCode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleConfirmCode(e) {
    e.preventDefault();
    setError("");
    setConfirming(true);
    try {
      const res = await fetch("/api/me/telegram/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to confirm code");
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 font-display text-xl font-semibold">Connect Telegram</h1>
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        Step 2 of 2 — required before you can use the app.
      </p>

      <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-neutral-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-neutral-300">
        <p className="mb-2 font-medium text-neutral-700 dark:text-neutral-200">How to find your Telegram chat id:</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Open Telegram (app or web).</li>
          <li>
            Search for{" "}
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              @userinfobot
            </a>{" "}
            and open a chat with it.
          </li>
          <li>Send it any message, e.g. "hi".</li>
          <li>It replies with your info — copy the number next to "Id".</li>
          <li>Paste that number below.</li>
        </ol>
      </div>

      {!codeSent ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label htmlFor="signup-chat-id" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Telegram chat id
            </label>
            <input
              required
              autoFocus
              id="signup-chat-id"
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className={inputClass}
              placeholder="e.g. 987654321"
            />
          </div>
          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send verification code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirmCode} className="space-y-4">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Code sent — check Telegram.</p>
          <div>
            <label htmlFor="signup-code" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              6-digit code
            </label>
            <input
              required
              autoFocus
              id="signup-code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={inputClass}
              placeholder="123456"
            />
          </div>
          {error && (
            <p role="alert" aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={confirming || code.length !== 6}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-60"
          >
            {confirming ? "Confirming…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCodeSent(false);
              setError("");
            }}
            className="w-full rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Use a different chat id
          </button>
        </form>
      )}
    </>
  );
}

export default function SignupPage() {
  const [step, setStep] = useState("account");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-soft dark:border-neutral-800 dark:bg-neutral-900">
        {step === "account" ? (
          <AccountStep onCreated={() => setStep("telegram")} />
        ) : (
          <TelegramStep />
        )}
      </div>
    </main>
  );
}
