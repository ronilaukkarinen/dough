"use client";

import { Card } from "@/components/ui/card";
import { useLocale } from "@/lib/locale-context";
import { TrendingDown, Landmark, PiggyBank } from "lucide-react";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface NetWorthProps {
  accounts: Account[];
}

export function NetWorth({ accounts }: NetWorthProps) {
  const { t } = useLocale();

  const investments = accounts.filter((a) => a.type === "otherAsset");
  const debts = accounts.filter((a) => a.type === "otherDebt");
  const checking = accounts.filter((a) => a.type === "checking" || a.type === "savings");

  const investmentTotal = investments.reduce((s, a) => s + a.balance, 0);
  const debtTotal = debts.reduce((s, a) => s + a.balance, 0);
  const checkingTotal = checking.reduce((s, a) => s + a.balance, 0);
  const netWorth = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="net-worth-section">
      <h3 className="net-worth-heading">{t.dashboard.netWorth}</h3>

      <div className="net-worth-grid">
        <Card className="net-worth-hero">
          <p className="net-worth-hero-label">{t.dashboard.netWorth}</p>
          <p className="net-worth-hero-value" data-positive={netWorth >= 0 || undefined}>
            {netWorth.toFixed(2)} €
          </p>
        </Card>

        <Card className="net-worth-card">
          <div className="net-worth-card-row">
            <div className="net-worth-card-icon" data-color="primary">
              <Landmark />
            </div>
            <div>
              <p className="net-worth-card-label">{t.dashboard.accounts}</p>
              <p className="net-worth-card-value">{checkingTotal.toFixed(2)} €</p>
            </div>
          </div>
        </Card>

        <Card className="net-worth-card">
          <div className="net-worth-card-row">
            <div className="net-worth-card-icon" data-color="positive">
              <PiggyBank />
            </div>
            <div>
              <p className="net-worth-card-label">{t.dashboard.investments}</p>
              <p className="net-worth-card-value text-positive">{investmentTotal.toFixed(2)} €</p>
            </div>
          </div>
        </Card>

        <Card className="net-worth-card">
          <div className="net-worth-card-row">
            <div className="net-worth-card-icon" data-color="negative">
              <TrendingDown />
            </div>
            <div>
              <p className="net-worth-card-label">{t.debts.title}</p>
              <p className="net-worth-card-value text-negative">{debtTotal.toFixed(2)} €</p>
            </div>
          </div>
        </Card>
      </div>

      {investments.length > 0 && (
        <Card className="net-worth-list">
          <h4 className="net-worth-list-heading">{t.dashboard.investments}</h4>
          {investments.map((a) => (
            <div key={a.id} className="net-worth-list-item">
              <span className="net-worth-list-name">{a.name}</span>
              <span className="net-worth-list-amount">{a.balance.toFixed(2)} €</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
