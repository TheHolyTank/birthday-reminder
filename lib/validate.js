import { isValidISODateString } from "@/lib/date";

export const FRIEND_NAME_MAX = 200;
export const FRIEND_NOTE_MAX = 2000;
export const GROUP_NAME_MAX = 100;

export function parsePositiveIntParam(value) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function parseGroupIdInput(value) {
  if (value === null || value === undefined || value === "") return { ok: true, value: null };
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? { ok: true, value: n } : { ok: false };
}

export function validateFriendPayload(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > FRIEND_NAME_MAX) {
    return { ok: false, error: `Name is required (max ${FRIEND_NAME_MAX} characters)` };
  }
  if (!isValidISODateString(body?.birthday)) {
    return { ok: false, error: "Birthday must be a valid date (YYYY-MM-DD)" };
  }
  const note = body?.note;
  if (note != null && (typeof note !== "string" || note.length > FRIEND_NOTE_MAX)) {
    return { ok: false, error: `Note must be ${FRIEND_NOTE_MAX} characters or fewer` };
  }
  const group = parseGroupIdInput(body?.groupId);
  if (!group.ok) {
    return { ok: false, error: "groupId must be a positive integer or null" };
  }
  return {
    ok: true,
    data: { name, birthday: body.birthday, note: note || null, groupId: group.value, photoUrl: body?.photoUrl || null },
  };
}

export function validateGroupPayload(body) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > GROUP_NAME_MAX) {
    return { ok: false, error: `Name is required (max ${GROUP_NAME_MAX} characters)` };
  }
  return { ok: true, data: { name } };
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const USERNAME_MAX_LENGTH = 32;
// Letters (including Hebrew), numbers, "_", "-", "."
const USERNAME_RE = new RegExp("^[a-zA-Z0-9_.\\-\\u0590-\\u05FF]+$");

export function isValidUsername(username) {
  return (
    typeof username === "string" &&
    username.length > 0 &&
    username.length <= USERNAME_MAX_LENGTH &&
    USERNAME_RE.test(username)
  );
}

export function validateSignupPayload(body) {
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  if (!isValidUsername(username)) {
    return {
      ok: false,
      error: `Username is required (max ${USERNAME_MAX_LENGTH} characters; letters (including Hebrew), numbers, "_", "-", "." only)`,
    };
  }
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, error: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters` };
  }
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode : "";
  if (!inviteCode) {
    return { ok: false, error: "Invite code is required" };
  }
  return { ok: true, data: { username, password, inviteCode } };
}

export function validateTelegramChatId(value) {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  const str = String(value).trim();
  return /^-?\d+$/.test(str) ? { ok: true, value: str } : { ok: false, error: "Chat id must be a number" };
}

export function validatePasswordChangePayload(body) {
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  if (!currentPassword) {
    return { ok: false, error: "Enter your current password" };
  }
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, error: `New password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters` };
  }
  return { ok: true, data: { currentPassword, newPassword } };
}

export function isValidVerificationCode(code) {
  return typeof code === "string" && /^\d{6}$/.test(code.trim());
}

export function validateReminderSettingsPayload(body) {
  const offsetDays = Number(body?.offsetDays);
  if (offsetDays !== 0 && offsetDays !== 1) {
    return { ok: false, error: "offsetDays must be 0 (day of) or 1 (day before)" };
  }
  const localHour = Number(body?.localHour);
  if (!Number.isInteger(localHour) || localHour < 0 || localHour > 23) {
    return { ok: false, error: "localHour must be an integer from 0 to 23" };
  }
  const utcOffsetMinutes = Number(body?.utcOffsetMinutes);
  if (!Number.isInteger(utcOffsetMinutes) || utcOffsetMinutes < -720 || utcOffsetMinutes > 840) {
    return { ok: false, error: "utcOffsetMinutes is out of range" };
  }
  return { ok: true, data: { offsetDays, localHour, utcOffsetMinutes } };
}
