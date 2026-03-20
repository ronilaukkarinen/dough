"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale-context";

interface PersonalGreetingProps {
  todaySpentPersonal: number;
  todaySpentAll: number;
  dailyBudget: number;
  todayRemaining: number;
  suggestedForYou: number;
}

function valueStatus(value: number, budget: number): "good" | "tight" | "danger" {
  const ratio = value / budget;
  if (ratio > 0.5) return "good";
  if (ratio > 0.2) return "tight";
  return "danger";
}

export function PersonalGreeting({ todaySpentPersonal, todaySpentAll, dailyBudget, todayRemaining, suggestedForYou }: PersonalGreetingProps) {
  const [name, setName] = useState("");
  const { locale, fmt } = useLocale();

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
          {fmt(todaySpentPersonal)} €
        </span>
        {todaySpentAll > todaySpentPersonal && (
          <>
            {locale === "fi" ? ", perhe yhteensä " : ", household total "}
            <span className="personal-greeting-value" data-status={todaySpentAll > dailyBudget * 0.8 ? "danger" : todaySpentAll > dailyBudget * 0.5 ? "tight" : "good"}>
              {fmt(todaySpentAll)} €
            </span>
          </>
        )}
        {". "}
        {exceeded
          ? <>
              {locale === "fi" ? "Päiväbudjetti ylittynyt " : "Daily budget exceeded by "}
              <span className="personal-greeting-exceeded">{fmt(Math.abs(todayRemaining))} €</span>
              {locale === "fi" ? " verran. Huomenna parempi kulukuri sitten." : "."}
            </>
          : <>
              {locale === "fi" ? "Käytettävissä sinulle " : "Available for you "}
              <span className="personal-greeting-value" data-status={valueStatus(suggestedForYou, dailyBudget)}>
                {fmt(suggestedForYou)} €
              </span>
              {Math.abs(todayRemaining - suggestedForYou) > 1 && (
                <>
                  {locale === "fi" ? ", perheelle jäljellä " : ", household remaining "}
                  <span className="personal-greeting-value" data-status={valueStatus(todayRemaining, dailyBudget)}>
                    {fmt(todayRemaining)} €
                  </span>
                </>
              )}
              {"."}
            </>
        }
      </p>
    </div>
  );
}
