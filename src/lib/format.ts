/**
 * All dates/times are shown in the *business* timezone, not the browser's,
 * so a patient travelling abroad still sees the clinic's local appointment time.
 */

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, opts: Intl.DateTimeFormatOptions) {
  const key = tz + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...opts });
    cache.set(key, f);
  }
  return f;
}

/** "Mon, 5 Oct" */
export function formatDay(iso: string, tz: string) {
  return fmt(tz, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
}

/** "10:30 am" → normalised to "10:30 AM" */
export function formatTime(iso: string, tz: string) {
  return fmt(tz, { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).toUpperCase();
}

/** Parts for the big date block on tickets. */
export function dateParts(iso: string, tz: string) {
  const parts = fmt(tz, { weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return { weekday: get('weekday'), day: get('day'), month: get('month') };
}

/** 'HH:mm' → '3:00 PM' */
export function timeLabel(hhmm: string) {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Today's date 'YYYY-MM-DD' in a timezone. */
export function todayIn(tz: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' → "Mon, 5 Oct" (calendar date, timezone-free). */
export function formatDateOnly(date: string) {
  return fmt('UTC', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00Z`));
}

const WEEKDAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function describeDays(days: number[]) {
  const s = [...days].sort((a, b) => a - b);
  if (s.length === 7) return 'Every day';
  const contiguous = s.every((d, i) => i === 0 || d === s[i - 1]! + 1);
  return contiguous && s.length > 2 ? `${WEEKDAYS[s[0]!]}–${WEEKDAYS[s.at(-1)!]}` : s.map((d) => WEEKDAYS[d]).join(', ');
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
