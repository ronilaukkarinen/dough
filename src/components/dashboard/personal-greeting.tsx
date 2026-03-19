"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale-context";

interface PersonalGreetingProps {
  todaySpentPersonal: number;
  todaySpentAll: number;
  dailyBudget: number;
  personalDailyBudget: number;
  todayRemaining: number;
  personalRemaining: number;
}

function valueStatus(value: number, budget: number): "good" | "tight" | "danger" {
  const ratio = value / budget;
  if (ratio > 0.5) return "good";
  if (ratio > 0.2) return "tight";
  return "danger";
}

export function PersonalGreeting({ todaySpentPersonal, todaySpentAll, dailyBudget, personalDailyBudget, todayRemaining, personalRemaining }: PersonalGreetingProps) {
  const [name, setName] = useState("");
  const { locale, fmt } = useLocale();

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((data) => {
      if (data.profile?.display_name) setName(data.profile.display_name);
    }).catch(() => {});
  }, []);

  if (!name) return null;

  const personalExceeded = personalRemaining <= 0;

  return (
    <div className="personal-greeting">
      <p className="personal-greeting-text">
        {locale === "fi" ? `Hei ${name}! ` : `Hi ${name}! `}
        {locale === "fi" ? "Sinä olet käyttänyt tänään " : "You spent "}
        <span className="personal-greeting-value" data-status={todaySpentPersonal > personalDailyBudget * 0.5 ? "danger" : todaySpentPersonal > personalDailyBudget * 0.25 ? "tight" : "good"}>
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
        {personalExceeded
          ? <>
              {locale === "fi" ? "Oma päiväbudjettisi ylittynyt " : "Your daily budget exceeded by "}
              <span className="personal-greeting-exceeded">{fmt(Math.abs(personalRemaining))} €</span>
              {locale === "fi" ? " verran. Huomenna parempi kulukuri sitten." : "."}
            </>
          : <>
              {locale === "fi" ? "Sinulla on vielä " : "You can still spend "}
              <span className="personal-greeting-value" data-status={valueStatus(personalRemaining, personalDailyBudget)}>
                {fmt(personalRemaining)} €
              </span>
              {locale === "fi" ? " käytettävissä tänään." : " today."}
            </>
        }
      </p>
    </div>
  );
}
