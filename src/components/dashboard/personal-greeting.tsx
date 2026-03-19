"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale-context";

interface PersonalGreetingProps {
  todaySpent: number;
  dailyBudget: number;
}

function spentStatus(spent: number, budget: number): "good" | "tight" | "danger" {
  if (spent <= budget * 0.5) return "good";
  if (spent <= budget * 0.8) return "tight";
  return "danger";
}

function remainingStatus(remaining: number, budget: number): "good" | "tight" | "danger" {
  if (remaining > budget * 0.5) return "good";
  if (remaining > budget * 0.2) return "tight";
  return "danger";
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
  const remaining = personalBudget - todaySpent;
  const exceeded = remaining < 0;

  return (
    <div className="personal-greeting">
      <p className="personal-greeting-text">
        {locale === "fi" ? `Hei ${name}! ` : `Hi ${name}! `}
        {locale === "fi" ? "Tänään käytetty " : "Spent today "}
        <span className="personal-greeting-value" data-status={spentStatus(todaySpent, personalBudget)}>
          {todaySpent.toFixed(2)} €
        </span>
        {householdSize > 1 && (
          <>
            {locale === "fi" ? ", oma budjettisi " : ", your budget "}
            <span className="personal-greeting-value" data-status="good">
              {personalBudget.toFixed(2)} €
            </span>
            {locale === "fi" ? "/pv" : "/day"}
          </>
        )}
        {". "}
        {exceeded
          ? <span className="personal-greeting-exceeded">
              {locale === "fi" ? `Budjetti ylitetty ${Math.abs(remaining).toFixed(2)} €!` : `Budget exceeded by ${Math.abs(remaining).toFixed(2)} €!`}
            </span>
          : <>
              {locale === "fi" ? "Jäljellä " : "Remaining "}
              <span className="personal-greeting-value" data-status={remainingStatus(remaining, personalBudget)}>
                {remaining.toFixed(2)} €
              </span>
              {"."}
            </>
        }
      </p>
    </div>
  );
}
