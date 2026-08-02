"use client";

import { useEffect, useState } from "react";

const inputClass =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20";
const neutralPillClass =
  "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:ring-neutral-600";
const dangerPillClass = "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600";

async function apiFetch(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new Error("Session expired");
  }
  return res;
}

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [myUsername, setMyUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [resetPasswordId, setResetPasswordId] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [rowMessages, setRowMessages] = useState({}); // { [id]: { ok, message } }

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const [usersRes, meRes] = await Promise.all([apiFetch("/api/admin/users"), apiFetch("/api/me")]);
      if (usersRes.status === 403) {
        setForbidden(true);
        return;
      }
      if (!usersRes.ok || !meRes.ok) throw new Error("Failed to load users");
      setUsers(await usersRes.json());
      const me = await meRes.json();
      setMyUsername(me.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleDelete(id) {
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to delete user");
      setUsers((list) => list.filter((u) => u.id !== id));
    } catch (err) {
      setRowMessages((m) => ({ ...m, [id]: { ok: false, message: err.message } }));
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  }

  async function handleResetPassword(e, id) {
    e.preventDefault();
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/users/${id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to reset password");
      setRowMessages((m) => ({ ...m, [id]: { ok: true, message: "Password reset." } }));
      setResetPasswordId(null);
      setNewPasswordInput("");
    } catch (err) {
      setRowMessages((m) => ({ ...m, [id]: { ok: false, message: err.message } }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <a href="/" className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          ← Back to app
        </a>
        <h1 className="mt-2 font-display text-3xl font-bold">🛡 Admin — Users</h1>
      </header>

      {loading && <p className="text-neutral-500 dark:text-neutral-400">Loading…</p>}

      {forbidden && (
        <p className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-8 text-center text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400">
          You don't have access to this page.
        </p>
      )}

      {error && (
        <p role="alert" aria-live="polite" className="mb-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {!loading && !forbidden && (
        <ul className="space-y-3">
          {users.map((u) => {
            const isMe = u.username === myUsername;
            return (
              <li
                key={u.id}
                className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-softer dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {u.name || u.username}
                      {isMe && <span className="ml-2 text-xs text-neutral-400 dark:text-neutral-500">(you)</span>}
                      {u.is_admin && (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      {u.name && <>@{u.username} · </>}
                      Joined {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                      {u.telegram_chat_id ? (
                        <span className="text-emerald-600 dark:text-emerald-400">Telegram connected</span>
                      ) : (
                        <span>Telegram not connected</span>
                      )}
                    </p>
                  </div>

                  {!isMe && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setResetPasswordId(resetPasswordId === u.id ? null : u.id);
                          setNewPasswordInput("");
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${neutralPillClass}`}
                      >
                        Reset password
                      </button>
                      {confirmDeleteId === u.id ? (
                        <>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">Delete?</span>
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={busyId === u.id}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${dangerPillClass}`}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${neutralPillClass}`}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(u.id)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${dangerPillClass}`}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {resetPasswordId === u.id && (
                  <form onSubmit={(e) => handleResetPassword(e, u.id)} className="mt-3 flex flex-wrap items-end gap-2">
                    <div className="min-w-[10rem] flex-1">
                      <label htmlFor={`new-password-${u.id}`} className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        New password for {u.username}
                      </label>
                      <input
                        required
                        autoFocus
                        id={`new-password-${u.id}`}
                        type="text"
                        minLength={8}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busyId === u.id}
                      className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                    >
                      Set password
                    </button>
                  </form>
                )}

                {rowMessages[u.id] && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className={`mt-2 text-sm ${
                      rowMessages[u.id].ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {rowMessages[u.id].ok ? "✓ " : ""}
                    {rowMessages[u.id].message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
