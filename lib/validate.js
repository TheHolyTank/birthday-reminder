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
