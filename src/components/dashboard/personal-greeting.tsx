"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale-context";

interface PersonalGreetingProps {
  todaySpentPersonal: number;
  todaySpentAll: number;
  dailyBudget: number;
  todayRemaining: number;
}

function valueStatus(value: number, budget: number): "good" | "tight" | "danger" {
  const ratio = value / budget;
  if (ratio > 0.5) return "good";
  if (ratio > 0.2) return "tight";
  return "danger";
}

export function PersonalGreeting({ todaySpentPersonal, todaySpentAll, dailyBudget, todayRemaining }: PersonalGreetingProps) {
  const [name, setName] = useState("");
  const { locale } = useLocale();

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((data) => {
      if (data.profile?.display_name) setName(data.profile.display_name);
    }).catch(() => {});
  }, []);

  if (!name) return null;

  const exceeded = todayRemaining <= 0;

  return (
    <div className="personal-greeting">
      <p className="personal-greeting-text">
        {locale === "fi" ? `Hei ${name}! ` : `Hi ${name}! `}
        {locale === "fi" ? "Sinä olet käyttänyt tänään " : "You spent "}
        <span className="personal-greeting-value" data-status={todaySpentPersonal > dailyBudget * 0.3 ? "danger" : todaySpentPersonal > dailyBudget * 0.15 ? "tight" : "good"}>
          {todaySpentPersonal.toFixed(2)} €
        </span>
        {todaySpentAll > todaySpentPersonal && (
          <>
            {locale === "fi" ? ", talous yhteensä " : ", household total "}
            <span className="personal-greeting-value" data-status={todaySpentAll > dailyBudget * 0.8 ? "danger" : todaySpentAll > dailyBudget * 0.5 ? "tight" : "good"}>
              {todaySpentAll.toFixed(2)} €
            </span>
          </>
        )}
        {". "}
        {exceeded
          ? <span className="personal-greeting-exceeded">
              {locale === "fi" ? `Päiväbudjetti ylitetty ${Math.abs(todayRemaining).toFixed(2)} €!` : `Daily budget exceeded by ${Math.abs(todayRemaining).toFixed(2)} €!`}
            </span>
          : <>
              {locale === "fi" ? "Päiväbudjetista jäljellä " : "Daily budget remaining "}
              <span className="personal-greeting-value" data-status={valueStatus(todayRemaining, dailyBudget)}>
                {todayRemaining.toFixed(2)} €
              </span>
              {"."}
            </>
        }
      </p>
    </div>
  );
}
