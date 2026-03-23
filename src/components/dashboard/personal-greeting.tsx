"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale-context";
import { F } from "@/components/ui/f";

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
        {todaySpentPersonal > 0 && (
          <>
            {locale === "fi" ? "Olet käyttänyt tänään " : "You spent "}
            <span className="personal-greeting-value" data-status={todaySpentPersonal > dailyBudget * 0.3 ? "danger" : todaySpentPersonal > dailyBudget * 0.15 ? "tight" : "good"}>
              <F v={todaySpentPersonal} />
            </span>
            {todaySpentAll > todaySpentPersonal && (
              <>
                {locale === "fi" ? ", perhe yhteensä " : ", household total "}
                <span className="personal-greeting-value" data-status={todaySpentAll > dailyBudget * 0.8 ? "danger" : todaySpentAll > dailyBudget * 0.5 ? "tight" : "good"}>
                  <F v={todaySpentAll} />
                </span>
              </>
            )}
            {". "}
          </>
        )}
        {exceeded
          ? <>
              {locale === "fi" ? "Päiväbudjetti ylittynyt " : "Daily budget exceeded by "}
              <span className="personal-greeting-exceeded"><F v={Math.abs(todayRemaining)} /></span>
              {locale === "fi" ? " verran. Huomenna parempi kulukuri sitten." : "."}
            </>
          : <>
              {locale === "fi" ? "Käytä alle " : "Spend under "}
              <span className="personal-greeting-value" data-status={valueStatus(suggestedForYou, dailyBudget)}>
                <F v={suggestedForYou} />
              </span>
              {Math.abs(todayRemaining - suggestedForYou) > 1 && (
                <>
                  {locale === "fi" ? ", perheelle jäljellä " : ", household remaining "}
                  <span className="personal-greeting-value" data-status={valueStatus(todayRemaining, dailyBudget)}>
                    <F v={todayRemaining} />
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
