import { formatDistanceToNow, isToday, isYesterday, parseISO, type Locale as DateFnsLocale } from "date-fns";
import { fi, enUS } from "date-fns/locale";

const localeMap: Record<string, DateFnsLocale> = {
  fi,
  en: enUS,
};

export function relativeDate(dateStr: string, locale: string = "en"): string {
  const date = parseISO(dateStr);
  const loc = localeMap[locale] || enUS;

  if (isToday(date)) {
    return locale === "fi" ? "tänään" : "today";
  }
  if (isYesterday(date)) {
    return locale === "fi" ? "eilen" : "yesterday";
  }

  return formatDistanceToNow(date, { addSuffix: true, locale: loc });
}

export function formatDuration(months: number, locale: string = "en"): string {
  if (months <= 0) return locale === "fi" ? "0 kk" : "0m";
  if (months < 12) return locale === "fi" ? `${months} kk` : `${months}m`;
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (remaining === 0) return locale === "fi" ? `${years}v` : `${years}y`;
  return locale === "fi" ? `${years}v ${remaining}kk` : `${years}y ${remaining}m`;
}

export function formatDateShort(dateStr: string): string {
  const d = parseISO(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}
