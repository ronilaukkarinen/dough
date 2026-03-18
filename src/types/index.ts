export interface User {
  id: string;
  email: string;
  display_name: string;
  locale: "en" | "fi";
  ynab_budget_id?: string;
  created_at: string;
}

export interface RecurringBill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number; // day of month
  category?: string;
  is_active: boolean;
  created_at: string;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  expected_day: number; // day of month
  is_recurring: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  interest_rate: number;
  minimum_payment: number;
  due_day: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  ynab_id?: string;
  date: string;
  amount: number; // negative = expense, positive = income
  payee: string;
  category?: string;
  memo?: string;
  is_recurring: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface DailyAllowance {
  amount: number;
  daysUntilNextIncome: number;
  availableBalance: number;
  upcomingBills: number;
  upcomingIncome: number;
}

export interface SpendingByCategory {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface CashFlowPoint {
  date: string;
  balance: number;
  income: number;
  expenses: number;
}
