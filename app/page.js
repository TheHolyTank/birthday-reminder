"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GROUP_COLOR_SWATCHES, DEFAULT_GROUP_COLOR, groupStyle } from "@/lib/colors";
import { parseTypedDate, isValidDate, toISODate } from "@/lib/date";

const emptyFriendForm = { name: "", birthday: "", note: "", groupId: "", photoUrl: "" };
const emptyGroupForm = { name: "", color: DEFAULT_GROUP_COLOR };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 111 }, (_, i) => CURRENT_YEAR - i);

function daysUntilNextBirthday(birthday) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bday = new Date(birthday);
  const month = bday.getMonth() + 1;
  const day = bday.getDate();

  // Feb 29 birthdays are observed on Feb 28 in non-leap years, rather than
  // letting `new Date(year, 1, 29)` silently roll over to March 1.
  function occurrence(year) {
    const observedDay = isValidDate(year, month, day) ? day : month === 2 && day === 29 ? 28 : day;
    return new Date(year, month - 1, observedDay);
  }

  let next = occurrence(today.getFullYear());
  if (next < today) {
    next = occurrence(today.getFullYear() + 1);
  }
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

function formatBirthday(birthday) {
  const bday = new Date(birthday);
  return bday.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

// Formats an hour (0-23, in whatever clock it's meant to represent — here,
// the viewer's own local hour, stored as-is alongside their UTC offset) as
// a friendly 12-hour label.
function hourLabel(hour) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function apiFetch(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new Error("Session expired");
  }
  return res;
}

function resizeImageToDataUrl(file, maxDim = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, size, size, 0, 0, maxDim, maxDim);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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

function IconSun(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="10" cy="10" r="3.5" />
      <path
        strokeLinecap="round"
        d="M10 2.5v1.5M10 16v1.5M17.5 10H16M4 10H2.5M15.3 4.7l-1 1M5.7 14.3l-1 1M15.3 15.3l-1-1M5.7 5.7l-1-1"
      />
    </svg>
  );
}

function IconMoon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M16.5 12.6A7 7 0 0 1 7.4 3.5a7 7 0 1 0 9.1 9.1Z" />
    </svg>
  );
}

function IconCamera(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h2l1-2h6l1 2h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
      />
      <circle cx="10" cy="11.5" r="2.5" />
    </svg>
  );
}

function IconCheck(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" {...props}>
      <path d="M4.5 10.5 8 14l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GroupDot({ color, className = "h-2.5 w-2.5" }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={groupStyle(color).dot}
    />
  );
}

function GroupBadge({ group, isDark }) {
  if (!group) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
        Ungrouped
      </span>
    );
  }
  const s = groupStyle(group.color, isDark);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={s.badge}
    >
      <GroupDot color={group.color} />
      {group.name}
    </span>
  );
}

function GroupFilterPills({ groups, activeGroup, setActiveGroup, dark, neutralPillClass, activePillClass }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <button
        onClick={() => setActiveGroup("all")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
          activeGroup === "all" ? activePillClass : neutralPillClass
        }`}
      >
        All
      </button>
      {groups.map((g) => {
        const isActive = activeGroup === String(g.id);
        const s = groupStyle(g.color, dark);
        return (
          <button
            key={g.id}
            onClick={() => setActiveGroup(String(g.id))}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              isActive ? "" : neutralPillClass
            }`}
            style={
              isActive
                ? { backgroundColor: s.badge.backgroundColor, color: s.badge.color, boxShadow: `0 0 0 2px ${s.hex}` }
                : undefined
            }
          >
            <GroupDot color={g.color} />
            {g.name}
          </button>
        );
      })}
      <button
        onClick={() => setActiveGroup("ungrouped")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
          activeGroup === "ungrouped" ? activePillClass : neutralPillClass
        }`}
      >
        Ungrouped
      </button>
    </div>
  );
}

function ColorGrid({ value, onChange }) {
  return (
    <div className="grid w-max grid-cols-8 gap-2">
      {GROUP_COLOR_SWATCHES.map((hex, i) => {
        const selected = value === hex;
        return (
          <button
            type="button"
            key={hex}
            onClick={() => onChange(hex)}
            aria-label={`Color ${i + 1} of ${GROUP_COLOR_SWATCHES.length}`}
            aria-pressed={selected}
            className="flex h-6 w-6 items-center justify-center rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-neutral-900"
            style={{
              backgroundColor: hex,
              boxShadow: selected ? `0 0 0 2px var(--tw-ring-offset-color, white), 0 0 0 4px ${hex}` : "none",
            }}
          >
            {selected && <IconCheck className="h-3.5 w-3.5 text-white drop-shadow" />}
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dark, setDark] = useState(false);

  const [friendForm, setFriendForm] = useState(emptyFriendForm);
  const [editingFriendId, setEditingFriendId] = useState(null);
  const [savingFriend, setSavingFriend] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoDragging, setPhotoDragging] = useState(false);
  const fileInputRef = useRef(null);

  const [birthdayMode, setBirthdayMode] = useState("type");
  const [typedBirthday, setTypedBirthday] = useState("");
  const [calendarDay, setCalendarDay] = useState("");
  const [calendarMonth, setCalendarMonth] = useState("");
  const [calendarYear, setCalendarYear] = useState("");

  const [activeGroup, setActiveGroup] = useState("all");
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [savingGroup, setSavingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupForm, setEditGroupForm] = useState(emptyGroupForm);

  const [confirmDeleteFriendId, setConfirmDeleteFriendId] = useState(null);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("birthday"); // birthday | name | group | recent

  const [me, setMe] = useState({
    username: "",
    photo_url: null,
    telegram_chat_id: null,
    is_admin: false,
    reminder_offset_days: 1,
    reminder_local_hour: 20,
    reminder_utc_offset_minutes: 0,
  });
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const [usernameInput, setUsernameInput] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameResult, setUsernameResult] = useState(null); // { ok, message } | null

  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoResult, setPhotoResult] = useState(null); // { ok, message } | null
  const profilePhotoInputRef = useRef(null);

  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordResult, setPasswordResult] = useState(null); // { ok, message } | null

  const [telegramChatIdInput, setTelegramChatIdInput] = useState("");
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [telegramResult, setTelegramResult] = useState(null); // { ok, message } | null
  const [botUsername, setBotUsername] = useState(null);

  const [reminderOffsetInput, setReminderOffsetInput] = useState(1);
  const [reminderHourInput, setReminderHourInput] = useState(17);
  const [savingReminderSettings, setSavingReminderSettings] = useState(false);
  const [reminderSettingsResult, setReminderSettingsResult] = useState(null); // { ok, message } | null

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange(e) {
      let explicit;
      try {
        explicit = localStorage.getItem("theme");
      } catch {
        explicit = null;
      }
      if (explicit) return; // user has manually toggled — don't override their choice
      setDark(e.matches);
      document.documentElement.classList.toggle("dark", e.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [friendsRes, groupsRes, meRes] = await Promise.all([
        apiFetch("/api/friends"),
        apiFetch("/api/groups"),
        apiFetch("/api/me"),
      ]);
      if (!friendsRes.ok || !groupsRes.ok || !meRes.ok) throw new Error("Failed to load data");
      setFriends(await friendsRes.json());
      setGroups(await groupsRes.json());
      const meData = await meRes.json();
      setMe(meData);
      setUsernameInput(meData.username || "");
      setTelegramChatIdInput(meData.telegram_chat_id || "");
      setReminderOffsetInput(meData.reminder_offset_days ?? 1);
      setReminderHourInput(meData.reminder_local_hour ?? 20);
      apiFetch("/api/bot-info")
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => body?.username && setBotUsername(body.username))
        .catch(() => {});
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
    let list =
      activeGroup === "all"
        ? friends
        : activeGroup === "ungrouped"
        ? friends.filter((f) => !f.group_id)
        : friends.filter((f) => String(f.group_id) === String(activeGroup));
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((f) => f.name.toLowerCase().includes(query));
    }
    const sorted = [...list];
    if (sortMode === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "group") {
      sorted.sort((a, b) => {
        if (!a.group_name && !b.group_name) {
          return daysUntilNextBirthday(a.birthday) - daysUntilNextBirthday(b.birthday);
        }
        if (!a.group_name) return 1; // ungrouped sorts last
        if (!b.group_name) return -1;
        const cmp = a.group_name.localeCompare(b.group_name);
        return cmp !== 0 ? cmp : daysUntilNextBirthday(a.birthday) - daysUntilNextBirthday(b.birthday);
      });
    } else if (sortMode === "recent") {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
      sorted.sort((a, b) => daysUntilNextBirthday(a.birthday) - daysUntilNextBirthday(b.birthday));
    }
    return sorted;
  }, [friends, activeGroup, searchQuery, sortMode]);

  const birthdaysThisWeek = useMemo(
    () => friends.filter((f) => daysUntilNextBirthday(f.birthday) <= 7).length,
    [friends]
  );

  // Friends whose upcoming birthday falls within 6 days of another friend's —
  // considered across the whole list, not just the currently filtered view.
  const clusteredFriendIds = useMemo(() => {
    const withDays = friends.map((f) => ({ id: f.id, days: daysUntilNextBirthday(f.birthday) }));
    const clustered = new Set();
    for (let i = 0; i < withDays.length; i++) {
      for (let j = i + 1; j < withDays.length; j++) {
        if (Math.abs(withDays[i].days - withDays[j].days) <= 6) {
          clustered.add(withDays[i].id);
          clustered.add(withDays[j].id);
        }
      }
    }
    return clustered;
  }, [friends]);

  function syncCalendarPartsFromBirthday(birthday) {
    if (birthday) {
      const [y, m, d] = birthday.split("-").map(Number);
      setCalendarYear(String(y));
      setCalendarMonth(String(m));
      setCalendarDay(String(d));
    } else {
      setCalendarYear("");
      setCalendarMonth("");
      setCalendarDay("");
    }
  }

  function startEditFriend(friend) {
    setEditingFriendId(friend.id);
    setPhotoError("");
    setBirthdayMode("calendar");
    setTypedBirthday("");
    const birthday = friend.birthday.slice(0, 10);
    syncCalendarPartsFromBirthday(birthday);
    setFriendForm({
      name: friend.name,
      birthday,
      note: friend.note || "",
      groupId: friend.group_id ? String(friend.group_id) : "",
      photoUrl: friend.photo_url || "",
    });
  }

  function cancelEditFriend() {
    setEditingFriendId(null);
    setPhotoError("");
    setBirthdayMode("type");
    setTypedBirthday("");
    syncCalendarPartsFromBirthday("");
    setFriendForm(emptyFriendForm);
  }

  function handleTypedBirthdayChange(value) {
    setTypedBirthday(value);
    const parsed = parseTypedDate(value);
    setFriendForm((f) => ({ ...f, birthday: parsed || "" }));
  }

  const daysInSelectedMonth =
    calendarYear && calendarMonth ? new Date(Number(calendarYear), Number(calendarMonth), 0).getDate() : 31;

  function handleCalendarPartChange(part, value) {
    const next = {
      year: part === "year" ? value : calendarYear,
      month: part === "month" ? value : calendarMonth,
      day: part === "day" ? value : calendarDay,
    };
    if (part === "year") setCalendarYear(value);
    if (part === "month") setCalendarMonth(value);
    if (part === "day") setCalendarDay(value);

    const year = Number(next.year);
    const month = Number(next.month);
    const day = Number(next.day);
    const complete = next.year && next.month && next.day && isValidDate(year, month, day);
    setFriendForm((f) => ({ ...f, birthday: complete ? toISODate(year, month, day) : "" }));
  }

  async function handlePhotoFile(file) {
    if (!file) return;
    setPhotoError("");
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file");
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setFriendForm((f) => ({ ...f, photoUrl: dataUrl }));
    } catch (err) {
      setPhotoError(err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handlePhotoChange(e) {
    handlePhotoFile(e.target.files?.[0]);
  }

  function handlePhotoDragOver(e) {
    e.preventDefault();
    setPhotoDragging(true);
  }

  function handlePhotoDragLeave(e) {
    e.preventDefault();
    setPhotoDragging(false);
  }

  function handlePhotoDrop(e) {
    e.preventDefault();
    setPhotoDragging(false);
    handlePhotoFile(e.dataTransfer.files?.[0]);
  }

  async function handleFriendSubmit(e) {
    e.preventDefault();
    setError("");
    if (!friendForm.birthday) {
      setError(
        birthdayMode === "type"
          ? "Couldn't understand that birthday — try a format like 15/03/1995"
          : "Please choose a birthday"
      );
      return;
    }
    setSavingFriend(true);
    try {
      const url = editingFriendId ? `/api/friends/${editingFriendId}` : "/api/friends";
      const method = editingFriendId ? "PUT" : "POST";
      const res = await apiFetch(url, {
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
      setBirthdayMode("type");
      setTypedBirthday("");
      syncCalendarPartsFromBirthday("");
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingFriend(false);
    }
  }

  async function performDeleteFriend(id) {
    setError("");
    try {
      const res = await apiFetch(`/api/friends/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete friend");
      if (editingFriendId === id) cancelEditFriend();
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmDeleteFriendId(null);
    }
  }

  async function handleGroupSubmit(e) {
    e.preventDefault();
    setError("");
    setSavingGroup(true);
    try {
      const res = await apiFetch("/api/groups", {
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

  function startEditGroup(g) {
    setEditingGroupId(g.id);
    setEditGroupForm({ name: g.name, color: g.color });
  }

  function cancelEditGroup() {
    setEditingGroupId(null);
    setEditGroupForm(emptyGroupForm);
  }

  async function handleEditGroupSubmit(e, id) {
    e.preventDefault();
    setError("");
    setSavingGroup(true);
    try {
      const res = await apiFetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editGroupForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update group");
      }
      cancelEditGroup();
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingGroup(false);
    }
  }

  async function performDeleteGroup(id) {
    setError("");
    try {
      const res = await apiFetch(`/api/groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete group");
      if (activeGroup === String(id)) setActiveGroup("all");
      if (editingGroupId === id) cancelEditGroup();
      if (friendForm.groupId === String(id)) {
        setFriendForm((f) => ({ ...f, groupId: "" }));
      }
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmDeleteGroupId(null);
    }
  }

  async function handleUsernameSubmit(e) {
    e.preventDefault();
    setUsernameResult(null);
    setSavingUsername(true);
    try {
      const res = await apiFetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to save username");
      setMe(body);
      setUsernameInput(body.username || "");
      setUsernameResult({ ok: true, message: "Username updated." });
    } catch (err) {
      setUsernameResult({ ok: false, message: err.message });
    } finally {
      setSavingUsername(false);
    }
  }

  async function handleProfilePhotoFile(file) {
    if (!file) return;
    setPhotoResult(null);
    if (!file.type.startsWith("image/")) {
      setPhotoResult({ ok: false, message: "Please choose an image file" });
      return;
    }
    setSavingPhoto(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const res = await apiFetch("/api/me/photo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: dataUrl }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to save photo");
      setMe(body);
      setPhotoResult({ ok: true, message: "Photo updated." });
    } catch (err) {
      setPhotoResult({ ok: false, message: err.message });
    } finally {
      setSavingPhoto(false);
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
    }
  }

  async function handleRemoveProfilePhoto() {
    setPhotoResult(null);
    setSavingPhoto(true);
    try {
      const res = await apiFetch("/api/me/photo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to remove photo");
      setMe(body);
      setPhotoResult({ ok: true, message: "Photo removed." });
    } catch (err) {
      setPhotoResult({ ok: false, message: err.message });
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordResult(null);
    setSavingPassword(true);
    try {
      const res = await apiFetch("/api/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPasswordInput, newPassword: newPasswordInput }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to change password");
      setCurrentPasswordInput("");
      setNewPasswordInput("");
      setPasswordResult({ ok: true, message: "Password changed." });
    } catch (err) {
      setPasswordResult({ ok: false, message: err.message });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSendCode(e) {
    e.preventDefault();
    setTelegramResult(null);
    setSendingCode(true);
    try {
      const res = await apiFetch("/api/me/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramChatId: telegramChatIdInput }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to send code");
      setCodeSent(true);
      setVerificationCodeInput("");
      setTelegramResult({ ok: true, message: "Code sent — check Telegram and enter it below." });
    } catch (err) {
      setTelegramResult({ ok: false, message: err.message });
    } finally {
      setSendingCode(false);
    }
  }

  async function handleConfirmCode(e) {
    e.preventDefault();
    setTelegramResult(null);
    setConfirmingCode(true);
    try {
      const res = await apiFetch("/api/me/telegram/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCodeInput }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to confirm code");
      setMe(body);
      setTelegramChatIdInput(body.telegram_chat_id || "");
      setCodeSent(false);
      setVerificationCodeInput("");
      setTelegramResult({ ok: true, message: "Telegram connected ✓" });
    } catch (err) {
      setTelegramResult({ ok: false, message: err.message });
    } finally {
      setConfirmingCode(false);
    }
  }

  function cancelTelegramVerification() {
    setCodeSent(false);
    setVerificationCodeInput("");
    setTelegramResult(null);
  }

  async function handleReminderSettingsSubmit(e) {
    e.preventDefault();
    setReminderSettingsResult(null);
    setSavingReminderSettings(true);
    try {
      const res = await apiFetch("/api/me/reminder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offsetDays: Number(reminderOffsetInput),
          localHour: Number(reminderHourInput),
          utcOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to save reminder settings");
      setMe(body);
      setReminderSettingsResult({ ok: true, message: "Saved." });
    } catch (err) {
      setReminderSettingsResult({ ok: false, message: err.message });
    } finally {
      setSavingReminderSettings(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20";

  const neutralPillClass =
    "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:ring-neutral-600";
  const activePillClass = "bg-neutral-900 text-white shadow-soft dark:bg-white dark:text-neutral-900";
  const dangerPillClass = "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600";

  return (
    <main className="relative mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <div className="absolute left-4 top-4 flex items-center gap-2 sm:left-6 sm:top-6">
        <button
          onClick={handleLogout}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 shadow-softer ring-1 ring-neutral-200 transition hover:text-neutral-700 hover:ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-700 dark:hover:text-neutral-200 dark:hover:ring-neutral-600"
        >
          Log out
        </button>
        <button
          onClick={() => setShowSettingsPanel((v) => !v)}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 shadow-softer ring-1 ring-indigo-200 transition hover:bg-indigo-50 dark:bg-neutral-900 dark:text-indigo-300 dark:ring-indigo-500/30 dark:hover:bg-indigo-500/10"
        >
          {showSettingsPanel ? "Close settings" : "⚙ Settings"}
        </button>
        {me.is_admin && (
          <a
            href="/admin"
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 shadow-softer ring-1 ring-indigo-200 transition hover:bg-indigo-50 dark:bg-neutral-900 dark:text-indigo-300 dark:ring-indigo-500/30 dark:hover:bg-indigo-500/10"
          >
            🛡 Admin
          </a>
        )}
      </div>
      <button
        onClick={toggleTheme}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        aria-pressed={dark}
        suppressHydrationWarning
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-600 shadow-softer ring-1 ring-neutral-200 transition hover:ring-neutral-300 sm:right-6 sm:top-6 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:ring-neutral-600"
      >
        {dark ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
      </button>

      <header className="mb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-500 shadow-softer ring-1 ring-indigo-100 dark:bg-neutral-900/60 dark:text-indigo-300 dark:ring-indigo-500/30">
          🎉 Never miss a birthday
        </span>
        <h1 className="mt-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 bg-clip-text font-display text-4xl font-bold text-transparent sm:text-5xl">
          Birthday Reminder
        </h1>
        {me.username && (
          <p className="mt-2 flex items-center justify-center gap-2 font-display text-lg font-semibold text-neutral-700 dark:text-neutral-200">
            {me.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                {initials(me.username)}
              </span>
            )}
            Hello, {me.username} 👋
          </p>
        )}
        <p className="mx-auto mt-3 max-w-md text-neutral-500 dark:text-neutral-400">
          Keep everyone organized in groups, and get a Telegram nudge the day
          before so you never miss sending your regards.
        </p>
        {friends.length > 0 && (
          <p className="mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            🎂 {birthdaysThisWeek} birthday{birthdaysThisWeek === 1 ? "" : "s"} this week
          </p>
        )}
      </header>

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <GroupFilterPills
        groups={groups}
        activeGroup={activeGroup}
        setActiveGroup={setActiveGroup}
        dark={dark}
        neutralPillClass={neutralPillClass}
        activePillClass={activePillClass}
      />

      {/* Account settings panel */}
      {showSettingsPanel && (
        <div className="mb-8 space-y-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-soft dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h2 className="mb-3 font-display text-base font-semibold">Profile photo</h2>
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-semibold text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                {me.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(me.username || "?")
                )}
              </div>
              <div>
                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleProfilePhotoFile(e.target.files?.[0])}
                  className="hidden"
                  id="profile-photo-input"
                />
                <div className="flex gap-2">
                  <label
                    htmlFor="profile-photo-input"
                    className="cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    {me.photo_url ? "Change photo" : "Upload photo"}
                  </label>
                  {me.photo_url && (
                    <button
                      type="button"
                      onClick={handleRemoveProfilePhoto}
                      disabled={savingPhoto}
                      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {photoResult && (
                  <p
                    role="alert"
                    aria-live="polite"
                    className={`mt-1.5 text-xs ${
                      photoResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {photoResult.ok ? "✓ " : ""}
                    {photoResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <h2 className="mb-3 font-display text-base font-semibold">Username</h2>
            <form onSubmit={handleUsernameSubmit} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[10rem] flex-1">
                <label htmlFor="profile-username" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Username
                </label>
                <input
                  required
                  id="profile-username"
                  type="text"
                  maxLength={32}
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setUsernameResult(null);
                  }}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={savingUsername}
                className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {savingUsername ? "Saving…" : "Save"}
              </button>
            </form>
            {usernameResult && (
              <p
                role="alert"
                aria-live="polite"
                className={`mt-3 text-sm ${
                  usernameResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {usernameResult.ok ? "✓ " : ""}
                {usernameResult.message}
              </p>
            )}
          </div>

          <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <h2 className="mb-3 font-display text-base font-semibold">Password</h2>
            <form onSubmit={handlePasswordSubmit} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[10rem] flex-1">
                <label htmlFor="current-password" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Current password
                </label>
                <input
                  required
                  id="current-password"
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="min-w-[10rem] flex-1">
                <label htmlFor="new-password" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  New password
                </label>
                <input
                  required
                  id="new-password"
                  type="password"
                  minLength={8}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {savingPassword ? "Saving…" : "Change password"}
              </button>
            </form>
            {passwordResult && (
              <p
                role="alert"
                aria-live="polite"
                className={`mt-3 text-sm ${
                  passwordResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {passwordResult.ok ? "✓ " : ""}
                {passwordResult.message}
              </p>
            )}
          </div>

          <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <h2 className="mb-1 font-display text-base font-semibold">Telegram</h2>
            <p className="mb-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              {me.telegram_chat_id ? (
                <>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Connected</span> to chat id{" "}
                  {me.telegram_chat_id}.
                </>
              ) : (
                <>Not connected yet — reminders won't send until this is verified.</>
              )}
            </p>
            <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
              First message{" "}
              {botUsername ? (
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  @{botUsername}
                </a>
              ) : (
                "our reminder bot"
              )}{" "}
              (any message, e.g. "hi") — required, since Telegram bots can't
              message you until you've messaged them first. Then message{" "}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                @userinfobot
              </a>{" "}
              to get your numeric chat id.
            </p>

            {!codeSent ? (
              <form onSubmit={handleSendCode} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem] flex-1">
                  <label htmlFor="telegram-chat-id" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Telegram chat id
                  </label>
                  <input
                    id="telegram-chat-id"
                    type="text"
                    value={telegramChatIdInput}
                    onChange={(e) => {
                      setTelegramChatIdInput(e.target.value);
                      setTelegramResult(null);
                    }}
                    className={inputClass}
                    placeholder="e.g. 987654321"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sendingCode || !telegramChatIdInput.trim()}
                  className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {sendingCode ? "Sending…" : "Send verification code"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmCode} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[8rem]">
                  <label htmlFor="verification-code" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    6-digit code
                  </label>
                  <input
                    required
                    autoFocus
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={verificationCodeInput}
                    onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={inputClass}
                    placeholder="123456"
                  />
                </div>
                <button
                  type="submit"
                  disabled={confirmingCode || verificationCodeInput.length !== 6}
                  className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {confirmingCode ? "Confirming…" : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={cancelTelegramVerification}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${neutralPillClass}`}
                >
                  Cancel
                </button>
              </form>
            )}
            {telegramResult && (
              <p
                role="alert"
                aria-live="polite"
                className={`mt-3 text-sm ${
                  telegramResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {telegramResult.ok ? "✓ " : ""}
                {telegramResult.message}
              </p>
            )}
          </div>

          <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <h2 className="mb-1 font-display text-base font-semibold">Reminder timing</h2>
            <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
              When to send the Telegram reminder for each friend's birthday.
            </p>
            <form onSubmit={handleReminderSettingsSubmit} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">Send</label>
                <div className="flex rounded-lg bg-neutral-100 p-0.5 text-xs font-medium dark:bg-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setReminderOffsetInput(1);
                      setReminderSettingsResult(null);
                    }}
                    aria-pressed={Number(reminderOffsetInput) === 1}
                    className={`rounded-md px-2.5 py-1.5 transition ${
                      Number(reminderOffsetInput) === 1
                        ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    Day before
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReminderOffsetInput(0);
                      setReminderSettingsResult(null);
                    }}
                    aria-pressed={Number(reminderOffsetInput) === 0}
                    className={`rounded-md px-2.5 py-1.5 transition ${
                      Number(reminderOffsetInput) === 0
                        ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    Day of
                  </button>
                </div>
              </div>
              <div className="min-w-[8rem]">
                <label htmlFor="reminder-hour" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  At (your local time)
                </label>
                <select
                  id="reminder-hour"
                  value={reminderHourInput}
                  onChange={(e) => {
                    setReminderHourInput(e.target.value);
                    setReminderSettingsResult(null);
                  }}
                  className={inputClass}
                >
                  {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={savingReminderSettings}
                className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
              >
                {savingReminderSettings ? "Saving…" : "Save"}
              </button>
            </form>
            {reminderSettingsResult && (
              <p
                role="alert"
                aria-live="polite"
                className={`mt-3 text-sm ${
                  reminderSettingsResult.ok
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {reminderSettingsResult.ok ? "✓ " : ""}
                {reminderSettingsResult.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add / edit friend */}
      <form
        onSubmit={handleFriendSubmit}
        className="mb-10 rounded-2xl border border-neutral-200 bg-white p-6 shadow-soft dark:border-neutral-800 dark:bg-neutral-900"
      >
        <h2 className="mb-4 font-display text-lg font-semibold">
          {editingFriendId ? "Edit friend" : "Add a friend"}
        </h2>

        <div
          onDragOver={handlePhotoDragOver}
          onDragLeave={handlePhotoDragLeave}
          onDrop={handlePhotoDrop}
          className={`relative mb-5 flex items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition ${
            photoDragging
              ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/10"
              : "border-neutral-200 dark:border-neutral-700"
          }`}
        >
          <label
            htmlFor="photo-input"
            className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-lg font-semibold text-neutral-400 ring-offset-2 ring-offset-white transition dark:bg-neutral-800 dark:text-neutral-500 dark:ring-offset-neutral-900"
          >
            {friendForm.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={friendForm.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : friendForm.name ? (
              initials(friendForm.name)
            ) : (
              <IconCamera className="h-6 w-6" />
            )}
          </label>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              id="photo-input"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Drag &amp; drop a photo anywhere here, or
            </p>
            <div className="mt-1.5 flex gap-2">
              <label
                htmlFor="photo-input"
                className="cursor-pointer rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {friendForm.photoUrl ? "Change photo" : "Choose a file"}
              </label>
              {friendForm.photoUrl && (
                <button
                  type="button"
                  onClick={() => setFriendForm((f) => ({ ...f, photoUrl: "" }))}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  Remove
                </button>
              )}
            </div>
            {photoError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{photoError}</p>}
          </div>
          {photoDragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-indigo-600/10 text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Drop to set photo
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="friend-name" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Name
            </label>
            <input
              required
              id="friend-name"
              type="text"
              value={friendForm.name}
              onChange={(e) => setFriendForm({ ...friendForm, name: e.target.value })}
              className={inputClass}
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Birthday
              </label>
              <div className="flex rounded-lg bg-neutral-100 p-0.5 text-xs font-medium dark:bg-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setBirthdayMode("calendar");
                    syncCalendarPartsFromBirthday(friendForm.birthday);
                  }}
                  aria-pressed={birthdayMode === "calendar"}
                  className={`rounded-md px-2.5 py-1 transition ${
                    birthdayMode === "calendar"
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setBirthdayMode("type")}
                  aria-pressed={birthdayMode === "type"}
                  className={`rounded-md px-2.5 py-1 transition ${
                    birthdayMode === "type"
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  Type it
                </button>
              </div>
            </div>

            {birthdayMode === "calendar" ? (
              <div className="grid grid-cols-3 gap-2">
                <select
                  required
                  value={calendarDay}
                  onChange={(e) => handleCalendarPartChange("day", e.target.value)}
                  className={inputClass}
                  aria-label="Day"
                >
                  <option value="">Day</option>
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={calendarMonth}
                  onChange={(e) => handleCalendarPartChange("month", e.target.value)}
                  className={inputClass}
                  aria-label="Month"
                >
                  <option value="">Month</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={calendarYear}
                  onChange={(e) => handleCalendarPartChange("year", e.target.value)}
                  className={inputClass}
                  aria-label="Year"
                >
                  <option value="">Year</option>
                  {BIRTH_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={typedBirthday}
                  onChange={(e) => handleTypedBirthdayChange(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 15/03/1995 or March 15 1995"
                />
                {typedBirthday &&
                  (friendForm.birthday ? (
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                      → {formatBirthday(friendForm.birthday)}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Couldn't understand that date — try 15/03/1995 or "March 15 1995"
                    </p>
                  ))}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="friend-note" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Note (optional)
            </label>
            <input
              id="friend-note"
              type="text"
              value={friendForm.note}
              onChange={(e) => setFriendForm({ ...friendForm, note: e.target.value })}
              className={inputClass}
              placeholder="e.g. college roommate"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Group
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFriendForm({ ...friendForm, groupId: "" })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  friendForm.groupId === ""
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-50 text-neutral-500 ring-1 ring-neutral-200 hover:ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700 dark:hover:ring-neutral-600"
                }`}
              >
                None
              </button>
              {groups.map((g) => {
                const isSelected = friendForm.groupId === String(g.id);
                const s = groupStyle(g.color, dark);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => setFriendForm({ ...friendForm, groupId: String(g.id) })}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                      isSelected
                        ? ""
                        : "bg-neutral-50 text-neutral-500 ring-1 ring-neutral-200 hover:ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700 dark:hover:ring-neutral-600"
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: s.badge.backgroundColor, color: s.badge.color, boxShadow: `0 0 0 2px ${s.hex}` }
                        : undefined
                    }
                  >
                    <GroupDot color={g.color} />
                    {g.name}
                  </button>
                );
              })}
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
              className="rounded-xl border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Friends list + sidebar filters */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="space-y-4 lg:w-56 lg:shrink-0">
          {friends.length > 0 && (
            <>
              <div>
                <label htmlFor="friend-search" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Search
                </label>
                <input
                  id="friend-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name"
                  className={`${inputClass} w-full`}
                />
              </div>
              <div>
                <label htmlFor="friend-sort" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Sort by
                </label>
                <select
                  id="friend-sort"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                  className={`${inputClass} w-full`}
                >
                  <option value="birthday">Soonest birthday</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="group">Group</option>
                  <option value="recent">Recently added</option>
                </select>
              </div>
            </>
          )}
          <div>
            <p className="mb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">Group</p>
            <GroupFilterPills
              groups={groups}
              activeGroup={activeGroup}
              setActiveGroup={setActiveGroup}
              dark={dark}
              neutralPillClass={neutralPillClass}
              activePillClass={activePillClass}
            />
          </div>
          <button
            onClick={() => setShowGroupPanel((v) => !v)}
            className="w-full rounded-full bg-white px-4 py-1.5 text-sm font-medium text-indigo-600 ring-1 ring-indigo-200 transition hover:bg-indigo-50 dark:bg-neutral-900 dark:text-indigo-300 dark:ring-indigo-500/30 dark:hover:bg-indigo-500/10"
          >
            {showGroupPanel ? "Close groups" : "＋ Manage groups"}
          </button>
        </aside>

        <section className="min-w-0 flex-1">
          <h2 className="mb-4 font-display text-lg font-semibold">Upcoming birthdays</h2>

          {loading && <p className="text-neutral-500 dark:text-neutral-400">Loading…</p>}
        {!loading && visibleFriends.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-8 text-center text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400">
            {searchQuery.trim() ? (
              <>
                <p>No friends match "{searchQuery.trim()}".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={`mt-3 rounded-full px-4 py-1.5 text-sm font-medium transition ${neutralPillClass}`}
                >
                  Clear search
                </button>
              </>
            ) : friends.length === 0 ? (
              <p>No birthdays yet — add your first friend above.</p>
            ) : (
              <>
                <p>
                  No one in{" "}
                  {activeGroup === "ungrouped" ? "Ungrouped" : groupsById.get(Number(activeGroup))?.name || "this group"}{" "}
                  yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveGroup("all")}
                  className={`mt-3 rounded-full px-4 py-1.5 text-sm font-medium transition ${neutralPillClass}`}
                >
                  Show all friends
                </button>
              </>
            )}
          </div>
        )}

        <ul className="space-y-3">
          {visibleFriends.map((friend) => {
            const days = daysUntilNextBirthday(friend.birthday);
            const group = friend.group_id ? groupsById.get(friend.group_id) : null;
            const s = group ? groupStyle(group.color, dark) : null;
            return (
              <li
                key={friend.id}
                className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-softer transition hover:shadow-soft dark:border-neutral-800 dark:bg-neutral-900"
              >
                {friend.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={friend.photo_url}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${
                      group ? "" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                    style={group ? s.avatar : undefined}
                  >
                    {initials(friend.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{friend.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                    <span>{formatBirthday(friend.birthday)}</span>
                    {friend.note && <span className="truncate">· {friend.note}</span>}
                    {friend.last_reminded_year === CURRENT_YEAR && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <IconCheck className="h-3 w-3" />
                        Reminded
                      </span>
                    )}
                    {clusteredFriendIds.has(friend.id) && (
                      <span
                        title="Another friend's birthday falls within a week of this one"
                        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                      >
                        🎉 Same week
                      </span>
                    )}
                    {activeGroup === "all" && <GroupBadge group={group} isDark={dark} />}
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                    days <= 1
                      ? "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `${days}d`}
                </span>

                {confirmDeleteFriendId === friend.id ? (
                  <div className="flex shrink-0 items-center gap-1.5 text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">Delete?</span>
                    <button
                      onClick={() => performDeleteFriend(friend.id)}
                      className={`rounded-full px-2.5 py-1 font-medium transition ${dangerPillClass}`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteFriendId(null)}
                      className={`rounded-full px-2.5 py-1 font-medium transition ${neutralPillClass}`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity max-sm:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      onClick={() => startEditFriend(friend)}
                      className="rounded-lg p-2 text-neutral-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:text-neutral-500 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                      aria-label={`Edit ${friend.name}`}
                    >
                      <IconPencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteFriendId(friend.id)}
                      className="rounded-lg p-2 text-neutral-400 transition hover:bg-red-50 hover:text-red-600 dark:text-neutral-500 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                      aria-label={`Delete ${friend.name}`}
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
          </ul>
        </section>
      </div>

      {/* Manage groups panel */}
      {showGroupPanel && (
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-soft dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-3 font-display text-base font-semibold">Manage groups</h2>

          {groups.length > 0 && (
            <ul className="mb-4 space-y-2">
              {groups.map((g) => {
                const isEditingThis = editingGroupId === g.id;
                const s = groupStyle(g.color, dark);
                return (
                  <li
                    key={g.id}
                    className={`rounded-xl border px-3.5 py-2.5 ${
                      isEditingThis ? "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800" : ""
                    }`}
                    style={isEditingThis ? undefined : s.badge}
                  >
                    {isEditingThis ? (
                      <form
                        onSubmit={(e) => handleEditGroupSubmit(e, g.id)}
                        className="flex flex-wrap items-start gap-3"
                      >
                        <div className="min-w-[8rem] flex-1">
                          <input
                            required
                            type="text"
                            value={editGroupForm.name}
                            onChange={(e) =>
                              setEditGroupForm({ ...editGroupForm, name: e.target.value })
                            }
                            className={inputClass}
                          />
                          <div className="mt-2">
                            <ColorGrid
                              value={editGroupForm.color}
                              onChange={(color) => setEditGroupForm({ ...editGroupForm, color })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={savingGroup}
                            className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditGroup}
                            className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                          <GroupDot color={g.color} />
                          {g.name}
                        </span>
                        {confirmDeleteGroupId === g.id ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-neutral-500 dark:text-neutral-400">Delete?</span>
                            <button
                              onClick={() => performDeleteGroup(g.id)}
                              className={`rounded-full px-2.5 py-1 font-medium transition ${dangerPillClass}`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDeleteGroupId(null)}
                              className={`rounded-full px-2.5 py-1 font-medium transition ${neutralPillClass}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditGroup(g)}
                              className="rounded-lg p-1.5 opacity-70 transition hover:opacity-100"
                              aria-label={`Edit ${g.name}`}
                            >
                              <IconPencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteGroupId(g.id)}
                              className="rounded-lg p-1.5 opacity-70 transition hover:opacity-100"
                              aria-label={`Delete ${g.name}`}
                            >
                              <IconTrash className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form onSubmit={handleGroupSubmit} className="space-y-3">
            <div>
              <label htmlFor="group-name" className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                New group name
              </label>
              <input
                required
                id="group-name"
                type="text"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                className={inputClass}
                placeholder="e.g. College"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Color
              </label>
              <ColorGrid value={groupForm.color} onChange={(color) => setGroupForm({ ...groupForm, color })} />
            </div>
            <button
              type="submit"
              disabled={savingGroup}
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Add group
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
