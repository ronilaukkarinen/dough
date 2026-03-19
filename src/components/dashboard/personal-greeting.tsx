"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale-context";

interface PersonalGreetingProps {
  todaySpent: number;
  dailyBudget: number;
}

export function PersonalGreeting({ todaySpent, dailyBudget }: PersonalGreetingProps) {
  const [name, setName] = useState("");
  const [householdSize, setHouseholdSize] = useState(1);
  const { locale } = useLocale();

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then((r) => r.json()),
      fetch("/api/household").then((r) => r.json()),
    ]).then(([profileData, householdData]) => {
      if (profileData.profile?.display_name) setName(profileData.profile.display_name);
      if (householdData.settings?.household_size) setHouseholdSize(parseInt(householdData.settings.household_size, 10));
    }).catch(() => {});
  }, []);

  if (!name) return null;

  const personalBudget = householdSize > 1 ? Math.round((dailyBudget / householdSize) * 100) / 100 : dailyBudget;
  const remaining = Math.max(0, personalBudget - todaySpent);

  return (
    <div className="personal-greeting">
      <p className="personal-greeting-text">
        {locale === "fi"
          ? `Hei ${name}! Olet käyttänyt tänään ${todaySpent.toFixed(2)} €. `
          : `Hi ${name}! You've spent ${todaySpent.toFixed(2)} € today. `}
        {householdSize > 1 && (
          locale === "fi"
            ? `Henkilökohtainen budjettisi on ${personalBudget.toFixed(2)} €/pv. `
            : `Your personal budget is ${personalBudget.toFixed(2)} €/day. `
        )}
        {remaining > 0
          ? (locale === "fi"
            ? `Jäljellä ${remaining.toFixed(2)} €.`
            : `${remaining.toFixed(2)} € remaining.`)
          : (locale === "fi"
            ? `Päiväbudjetti ylitetty.`
            : `Daily budget exceeded.`)}
      </p>
    </div>
  );
}
