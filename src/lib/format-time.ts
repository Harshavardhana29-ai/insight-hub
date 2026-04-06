/**
 * Shared timestamp formatting — always displays in the browser's local timezone.
 * Uses the same style as chat session timestamps for consistency.
 */

const SHORT_DATE_TIME: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const FULL_DATE_TIME: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", SHORT_DATE_TIME);
  } catch {
    return "—";
  }
}

export function formatFullDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", FULL_DATE_TIME);
  } catch {
    return "—";
  }
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    if (date >= todayStart && date < tomorrowStart) {
      return `Today ${time}`;
    }
    if (date >= yesterdayStart && date < todayStart) {
      return `Yesterday ${time}`;
    }
    if (date >= tomorrowStart && date < tomorrowEnd) {
      return `Tomorrow ${time}`;
    }

    return date.toLocaleDateString("en-US", SHORT_DATE_TIME);
  } catch {
    return "—";
  }
}
