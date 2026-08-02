const MONTHS = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function normalizeYear(y) {
  if (y >= 100) return y;
  return y < 50 ? 2000 + y : 1900 + y;
}

function isValidDate(year, month, day) {
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(year, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
}

// Accepts free-typed birthdays in several common formats and normalizes them
// to an ISO "YYYY-MM-DD" string, or returns null if it can't confidently
// parse the input. Numeric day/month/year input is treated as day-first
// (15/03/1995), matching how most non-US people naturally type dates.
export function parseTypedDate(raw) {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (isValidDate(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`;
  }

  m = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = normalizeYear(Number(m[3]));
    if (isValidDate(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`;
  }

  m = text.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{2,4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = MONTHS[m[2]];
    const y = normalizeYear(Number(m[3]));
    if (mo && isValidDate(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`;
  }

  m = text.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})$/);
  if (m) {
    const mo = MONTHS[m[1]];
    const d = Number(m[2]);
    const y = normalizeYear(Number(m[3]));
    if (mo && isValidDate(y, mo, d)) return `${y}-${pad(mo)}-${pad(d)}`;
  }

  return null;
}
