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
    return locale === "fi" ? "tanaan" : "today";
  }
  if (isYesterday(date)) {
    return locale === "fi" ? "eilen" : "yesterday";
  }

  return formatDistanceToNow(date, { addSuffix: true, locale: loc });
}

export function formatDateShort(dateStr: string): string {
  const d = parseISO(dateStr);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}
