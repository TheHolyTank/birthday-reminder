"use client";

import { useEffect, useMemo, useState } from "react";
import { GROUP_COLOR_NAMES, colorFor } from "@/lib/colors";

const emptyFriendForm = { name: "", birthday: "", note: "", groupId: "" };
const emptyGroupForm = { name: "", color: GROUP_COLOR_NAMES[0] };

function daysUntilNextBirthday(birthday) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bday = new Date(birthday);
  let next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, bday.getMonth(), bday.getDate());
  }
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

function formatBirthday(birthday) {
  const bday = new Date(birthday);
  return bday.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function IconPencil(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M13.5 3.5 16.5 6.5 7 16H4V13L13.5 3.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrash(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6.5 0 .6 9.4A1.5 1.5 0 0 0 7.6 17h4.8a1.5 1.5 0 0 0 1.5-1.6L14.5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GroupDot({ color, className = "h-2.5 w-2.5" }) {
  return <span className={`inline-block rounded-full ${colorFor(color).dot} ${className}`} />;
}

function GroupBadge({ group }) {
  if (!group) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
        Ungrouped
      </span>
    );
  }
  const c = colorFor(group.color);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.badge}`}>
      <GroupDot color={group.color} />
      {group.name}
    </span>
  );
}

export default function Home() {
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [friendForm, setFriendForm] = useState(emptyFriendForm);
  const [editingFriendId, setEditingFriendId] = useState(null);
  const [savingFriend, setSavingFriend] = useState(false);

  const [activeGroup, setActiveGroup] = useState("all");
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [savingGroup, setSavingGroup] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [friendsRes, groupsRes] = await Promise.all([
        fetch("/api/friends"),
        fetch("/api/groups"),
      ]);
      if (!friendsRes.ok || !groupsRes.ok) throw new Error("Failed to load data");
      setFriends(await friendsRes.json());
      setGroups(await groupsRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const groupsById = useMemo(() => {
    const map = new Map();
    groups.forEach((g) => map.set(g.id, g));
    return map;
  }, [groups]);

  const visibleFriends = useMemo(() => {
    const list =
      activeGroup === "all"
        ? friends
        : activeGroup === "ungrouped"
        ? friends.filter((f) => !f.group_id)
        : friends.filter((f) => String(f.group_id) === String(activeGroup));
    return [...list].sort(
      (a, b) => daysUntilNextBirthday(a.birthday) - daysUntilNextBirthday(b.birthday)
    );
  }, [friends, activeGroup]);

  function startEditFriend(friend) {
    setEditingFriendId(friend.id);
    setFriendForm({
      name: friend.name,
      birthday: friend.birthday.slice(0, 10),
      note: friend.note || "",
      groupId: friend.group_id ? String(friend.group_id) : "",
    });
  }

  function cancelEditFriend() {
    setEditingFriendId(null);
    setFriendForm(emptyFriendForm);
  }

  async function handleFriendSubmit(e) {
    e.preventDefault();
    setError("");
    setSavingFriend(true);
    try {
      const url = editingFriendId ? `/api/friends/${editingFriendId}` : "/api/friends";
      const method = editingFriendId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...friendForm,
          groupId: friendForm.groupId || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save friend");
      }
      setFriendForm(emptyFriendForm);
      setEditingFriendId(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingFriend(false);
    }
  }

  async function handleDeleteFriend(id) {
    if (!confirm("Remove this friend?")) return;
    setError("");
    try {
      const res = await fetch(`/api/friends/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete friend");
      if (editingFriendId === id) cancelEditFriend();
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGroupSubmit(e) {
    e.preventDefault();
    setError("");
    setSavingGroup(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save group");
      }
      setGroupForm(emptyGroupForm);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleDeleteGroup(id) {
    if (!confirm("Delete this group? Members will become ungrouped.")) return;
    setError("");
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete group");
      if (activeGroup === String(id)) setActiveGroup("all");
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-500 shadow-softer ring-1 ring-indigo-100">
          🎉 Never miss a birthday
        </span>
        <h1 className="mt-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 bg-clip-text font-display text-4xl font-bold text-transparent sm:text-5xl">
          Birthday Reminder
        </h1>
        <p className="mx-auto mt-3 max-w-md text-neutral-500">
          Keep everyone organized in groups, and get a Telegram nudge the day
          before so you never miss sending your regards.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Group filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveGroup("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            activeGroup === "all"
              ? "bg-neutral-900 text-white shadow-soft"
              : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-300"
          }`}
        >
          All
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setActiveGroup(String(g.id))}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeGroup === String(g.id)
                ? `${colorFor(g.color).badge} ring-2 ${colorFor(g.color).ring} ring-offset-1`
                : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-300"
            }`}
          >
            <GroupDot color={g.color} />
            {g.name}
          </button>
        ))}
        <button
          onClick={() => setActiveGroup("ungrouped")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            activeGroup === "ungrouped"
              ? "bg-neutral-900 text-white shadow-soft"
              : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-300"
          }`}
        >
          Ungrouped
        </button>
        <button
          onClick={() => setShowGroupPanel((v) => !v)}
          className="ml-auto rounded-full bg-white px-4 py-1.5 text-sm font-medium text-indigo-600 ring-1 ring-indigo-200 transition hover:bg-indigo-50"
        >
          {showGroupPanel ? "Close groups" : "＋ Manage groups"}
        </button>
      </div>

      {/* Manage groups panel */}
      {showGroupPanel && (
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold">Manage groups</h2>

          {groups.length > 0 && (
            <ul className="mb-4 divide-y divide-neutral-100">
              {groups.map((g) => (
                <li key={g.id} className="flex items-center justify-between py-2">
                  <GroupBadge group={g} />
                  <button
                    onClick={() => handleDeleteGroup(g.id)}
                    className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${g.name}`}
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleGroupSubmit} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[10rem]">
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                New group name
              </label>
              <input
                required
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                className={inputClass}
                placeholder="e.g. College"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">Color</label>
              <div className="flex gap-1.5">
                {GROUP_COLOR_NAMES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setGroupForm({ ...groupForm, color: c })}
                    className={`h-7 w-7 rounded-full ${colorFor(c).dot} transition ${
                      groupForm.color === c ? "ring-2 ring-offset-2 ring-neutral-400" : ""
                    }`}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={savingGroup}
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              Add group
            </button>
          </form>
        </div>
      )}

      {/* Add / edit friend */}
      <form
        onSubmit={handleFriendSubmit}
        className="mb-10 rounded-2xl border border-neutral-200 bg-white p-6 shadow-soft"
      >
        <h2 className="mb-4 font-display text-lg font-semibold">
          {editingFriendId ? "Edit friend" : "Add a friend"}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Name</label>
            <input
              required
              type="text"
              value={friendForm.name}
              onChange={(e) => setFriendForm({ ...friendForm, name: e.target.value })}
              className={inputClass}
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Birthday</label>
            <input
              required
              type="date"
              value={friendForm.birthday}
              onChange={(e) => setFriendForm({ ...friendForm, birthday: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              Note (optional)
            </label>
            <input
              type="text"
              value={friendForm.note}
              onChange={(e) => setFriendForm({ ...friendForm, note: e.target.value })}
              className={inputClass}
              placeholder="e.g. college roommate"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Group</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFriendForm({ ...friendForm, groupId: "" })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  friendForm.groupId === ""
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-50 text-neutral-500 ring-1 ring-neutral-200 hover:ring-neutral-300"
                }`}
              >
                None
              </button>
              {groups.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  onClick={() => setFriendForm({ ...friendForm, groupId: String(g.id) })}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    friendForm.groupId === String(g.id)
                      ? `${colorFor(g.color).badge} ring-2 ${colorFor(g.color).ring}`
                      : "bg-neutral-50 text-neutral-500 ring-1 ring-neutral-200 hover:ring-neutral-300"
                  }`}
                >
                  <GroupDot color={g.color} />
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={savingFriend}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 px-5 py-2.5 text-sm font-medium text-white shadow-soft transition hover:opacity-90 disabled:opacity-60"
          >
            {editingFriendId ? "Save changes" : "Add friend"}
          </button>
          {editingFriendId && (
            <button
              type="button"
              onClick={cancelEditFriend}
              className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Friends list */}
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">Upcoming birthdays</h2>

        {loading && <p className="text-neutral-500">Loading…</p>}
        {!loading && visibleFriends.length === 0 && (
          <p className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-8 text-center text-neutral-500">
            No one here yet.
          </p>
        )}

        <ul className="space-y-3">
          {visibleFriends.map((friend) => {
            const days = daysUntilNextBirthday(friend.birthday);
            const group = friend.group_id ? groupsById.get(friend.group_id) : null;
            const c = colorFor(group?.color);
            return (
              <li
                key={friend.id}
                className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-softer transition hover:shadow-soft"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${
                    group ? c.badge : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {initials(friend.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{friend.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
                    <span>{formatBirthday(friend.birthday)}</span>
                    {friend.note && <span className="truncate">· {friend.note}</span>}
                    {activeGroup === "all" && <GroupBadge group={group} />}
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                    days <= 1
                      ? "bg-pink-100 text-pink-700"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days}d`}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => startEditFriend(friend)}
                    className="rounded-lg p-2 text-neutral-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                    aria-label={`Edit ${friend.name}`}
                  >
                    <IconPencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFriend(friend.id)}
                    className="rounded-lg p-2 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${friend.name}`}
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
