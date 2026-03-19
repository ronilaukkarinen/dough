"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { X, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fi as fiFns, enUS } from "date-fns/locale";

interface EntryReminderProps {
  lastTransactionDate: string | null;
  onAddExpense: () => void;
}

export function EntryReminder({ lastTransactionDate, onAddExpense }: EntryReminderProps) {
  const [dismissed, setDismissed] = useState(false);
  const { locale } = useLocale();

  if (dismissed || !lastTransactionDate) return null;

  const lastDate = new Date(lastTransactionDate + "T23:59:59");
  const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);

  if (hoursSince < 6) return null;

  const timeAgo = formatDistanceToNow(lastDate, {
    addSuffix: false,
    locale: locale === "fi" ? fiFns : enUS,
  });

  return (
    <div className="entry-reminder">
      <div className="entry-reminder-content">
        <p className="entry-reminder-text">
          {locale === "fi"
            ? `Viimeisestä kirjauksesta on ${timeAgo}. Oletko lisännyt kulut?`
            : `It's been ${timeAgo} since your last entry. Have you added your expenses?`}
        </p>
        <button type="button" className="entry-reminder-add" onClick={onAddExpense}>
          <Plus />
          {locale === "fi" ? "Lisää kulu" : "Add expense"}
        </button>
      </div>
      <button type="button" className="entry-reminder-close" onClick={() => setDismissed(true)}>
        <X />
      </button>
    </div>
  );
}
