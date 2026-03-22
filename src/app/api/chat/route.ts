/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getFinancialAdvice } from "@/lib/ai/finance-advisor";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getYnabToken, getYnabBudgetId } from "@/lib/household";
import { eventBus } from "@/lib/event-bus";

export async function POST(request: Request) {
  try {
    const { messages, image, image_media_type, add_expense } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Get real YNAB data
    const user = await getSession();
    let context;

    if (user) {
      const token = getYnabToken();
      const budgetId = getYnabBudgetId();
      const locale = user.locale || "en";
      const { getHouseholdSetting } = await import("@/lib/household");
      const householdProfile = getHouseholdSetting("household_profile") || "";

      if (token && budgetId) {
        console.info("[chat] Loading YNAB data from cache");
        try {
          const now = new Date();

          // Use cached data instead of calling YNAB API directly
          const cached = getDb().prepare("SELECT data FROM ynab_cache WHERE id = 1").get() as { data: string } | undefined;
          if (!cached) throw new Error("No cached YNAB data");
          const ynabData = JSON.parse(cached.data);
          const { summary, transactions, monthBudget } = ynabData;

          const checkingSavings = summary.accounts
            .filter((a: any) => a.type === "checking" || a.type === "savings")
            .reduce((s: number, a: any) => s + a.balance, 0);

          // Load account notes for AI context
          const accountNotesRows = getDb()
            .prepare("SELECT ynab_account_id, note FROM account_notes WHERE note != ''")
            .all() as { ynab_account_id: string; note: string }[];
          const accountNotesMap: Record<string, string> = {};
          for (const r of accountNotesRows) accountNotesMap[r.ynab_account_id] = r.note;

          const accountsWithNotes = summary.accounts
            .filter((a: any) => a.type === "checking" || a.type === "savings" || a.type === "otherAsset")
            .map((a: any) => ({ name: a.name, balance: a.balance, type: a.type, note: accountNotesMap[a.id] || "" }));

          const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const daysLeft = daysInMonth - now.getDate();

          // Get debts from accounts with overrides
          const chatDb = getDb();
          const debtOverrides = chatDb.prepare("SELECT * FROM debt_overrides").all() as any[];
          const debtOverrideMap: Record<string, any> = {};
          for (const o of debtOverrides) debtOverrideMap[o.ynab_account_id] = o;

          const debts = summary.accounts
            .filter((a: any) => a.type === "otherDebt" && a.balance < 0)
            .map((a: any) => {
              const override = debtOverrideMap[a.id];
              return { name: a.name, remaining: Math.abs(a.balance), rate: override?.interest_rate ?? 0, minimumPayment: override?.minimum_payment ?? 0, dueDay: override?.due_day ?? 0 };
            });

          // Get investment accounts with overrides
          const investOverrides = chatDb.prepare("SELECT * FROM investment_overrides").all() as any[];
          const investOverrideMap: Record<string, any> = {};
          for (const o of investOverrides) investOverrideMap[o.ynab_account_id] = o;

          const investmentAccounts = summary.accounts
            .filter((a: any) => a.type === "otherAsset")
            .map((a: any) => {
              const override = investOverrideMap[a.id];
              return { name: a.name, balance: a.balance, monthlyContribution: override?.monthly_contribution ?? 0, expectedReturn: override?.expected_return ?? 7 };
            });

          // Get savings goal
          const savingRate = parseFloat(getHouseholdSetting("saving_rate") || "0");

          // Filter transfers
          const realIncomeTx = transactions.filter((t: any) => t.amount > 0 && !t.payee.startsWith("Transfer") && !t.payee.startsWith("Starting Balance") && !t.payee.startsWith("Reconciliation"));
          const realExpenseTx = transactions.filter((t: any) => t.amount < 0 && !t.payee.startsWith("Transfer") && !t.payee.startsWith("Starting Balance") && !t.payee.startsWith("Reconciliation") && t.category !== "Uncategorized");

          const recentTx = [...transactions]
            .filter((t: any) => !t.payee.startsWith("Transfer") && !t.payee.startsWith("Starting Balance") && !t.payee.startsWith("Reconciliation"))
            .sort((a: any, b: any) => b.date.localeCompare(a.date))
            .slice(0, 10)
            .map((t: any) => ({ date: t.date, payee: t.payee, amount: t.amount, category: t.category }));

          // Load recurring bills with paid/overdue status
          const bills = chatDb
            .prepare("SELECT id, name, amount, due_day FROM recurring_bills WHERE is_active = 1 ORDER BY due_day ASC")
            .all() as { id: number; name: string; amount: number; due_day: number }[];

          const chatMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const chatBillMatches = chatDb
            .prepare("SELECT source_id FROM monthly_matches WHERE source_type = 'bill' AND month = ?")
            .all(chatMonth) as { source_id: number }[];
          const paidBillIds = new Set(chatBillMatches.map((m) => m.source_id));

          const enrichedBills = bills.map((b) => ({
            name: b.name,
            amount: b.amount,
            dueDay: b.due_day,
            status: paidBillIds.has(b.id) ? "paid" : b.due_day < now.getDate() ? "overdue" : "upcoming",
          }));

          // Load subscriptions
          const subscriptions = chatDb
            .prepare("SELECT name, amount, due_day FROM subscriptions WHERE is_active = 1 ORDER BY due_day ASC")
            .all() as { name: string; amount: number; due_day: number }[];

          // Merge subscriptions into bills for calculations
          for (const sub of subscriptions) {
            enrichedBills.push({
              name: sub.name,
              amount: sub.amount,
              dueDay: sub.due_day,
              status: sub.due_day < now.getDate() ? "overdue" : "upcoming",
            });
          }

          // Load income sources from DB
          const incomeRows = chatDb
            .prepare("SELECT name, amount, expected_day FROM income_sources WHERE is_active = 1 ORDER BY expected_day ASC")
            .all() as { name: string; amount: number; expected_day: number }[];

          // Load savings goals
          const savingsGoals = chatDb
            .prepare("SELECT name, target_amount, saved_amount, priority, target_date FROM savings_goals WHERE is_active = 1 ORDER BY priority ASC")
            .all() as { name: string; target_amount: number; saved_amount: number; priority: string; target_date: string | null }[];

          // Load monthly history for comparisons
          const chatHistoryMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          const historySnapshots = chatDb
            .prepare("SELECT month, income, expenses FROM monthly_snapshots WHERE month < ? ORDER BY month DESC LIMIT 3")
            .all(chatHistoryMonth) as { month: string; income: number; expenses: number }[];

          // Pre-calculate time-sequenced cash flow for AI
          const today = now.getDate();
          const unpaidBills = enrichedBills.filter((b) => b.status !== "paid");
          const unpaidBillsTotal = unpaidBills.reduce((s, b) => s + b.amount, 0);
          const debtPaymentsTotal = debts.reduce((s: number, d: any) => s + (d.minimumPayment || 0), 0);
          const investmentContributions = investmentAccounts.reduce((s: number, i: any) => s + (i.monthlyContribution || 0), 0);

          // Load income matches and sources for daily budget simulation
          const chatIncomeMatches = chatDb
            .prepare("SELECT source_id FROM monthly_matches WHERE source_type = 'income' AND month = ?")
            .all(chatMonth) as { source_id: number }[];
          const matchedIncomeIds = new Set(chatIncomeMatches.map((m) => m.source_id));

          const incomeWithIds = chatDb
            .prepare("SELECT id, name, amount, expected_day FROM income_sources WHERE is_active = 1 ORDER BY expected_day ASC")
            .all() as { id: number; name: string; amount: number; expected_day: number }[];

          const resolveDay = (day: number) => day === 0 ? daysInMonth : day;

          // Daily budget via shared cash flow simulation
          const { calculateDailyBudget } = await import("@/lib/daily-budget");
          const dailyBudget = calculateDailyBudget({
            balance: checkingSavings,
            savingGoal: savingRate,
            today,
            daysInMonth,
            unpaidBills: unpaidBills.map((b) => ({ amount: b.amount, dueDay: b.dueDay })),
            debts: debts.map((d: any) => ({ amount: d.minimumPayment || 0, dueDay: d.dueDay || 0 })),
            unreceivedIncomes: incomeWithIds
              .filter((i) => resolveDay(i.expected_day) > today && !matchedIncomeIds.has(i.id))
              .map((i) => ({ amount: i.amount, expectedDay: i.expected_day })),
            resolveDay,
          });

          const incomeBeforePayday = incomeWithIds
            .filter((i) => i.expected_day >= today && i.expected_day < daysInMonth && !matchedIncomeIds.has(i.id))
            .reduce((s, i) => s + i.amount, 0);

          // Available before payday = current balance + small incomes before payday - bills - debts
          const availableBeforePayday = Math.round((checkingSavings + incomeBeforePayday - unpaidBillsTotal - debtPaymentsTotal) * 100) / 100;
          const daysBeforePayday = daysInMonth - today;
          const dailySpendableBeforePayday = daysBeforePayday > 0 ? Math.round((Math.max(0, availableBeforePayday) / daysBeforePayday) * 100) / 100 : 0;

          context = {
            totalBalance: Math.round(checkingSavings * 100) / 100,
            monthlyIncome: Math.round(realIncomeTx.reduce((s: number, t: any) => s + t.amount, 0) * 100) / 100,
            monthlyExpenses: Math.round(realExpenseTx.reduce((s: number, t: any) => s + Math.abs(t.amount), 0) * 100) / 100,
            upcomingBills: enrichedBills,
            recentTransactions: recentTx,
            debts,
            investments: investmentAccounts,
            savingGoal: savingRate,
            incomeSources: incomeRows.map((i) => ({ name: i.name, amount: i.amount, expectedDay: i.expected_day })),
            dailyBudget,
            daysUntilNextIncome: daysLeft,
            availableBeforePayday,
            dailySpendableBeforePayday,
            monthlyHistory: historySnapshots.map((s) => ({ month: s.month, income: Math.round(s.income), expenses: Math.round(s.expenses), net: Math.round(s.income - s.expenses) })),
            savingsGoals: savingsGoals.map((g) => ({ name: g.name, target: g.target_amount, saved: g.saved_amount, priority: g.priority, targetDate: g.target_date })),
            accounts: accountsWithNotes,
            locale,
            householdProfile,
            currentUser: user.display_name || user.email,
          };

          console.info("[chat] Context built with real data, balance:", context.totalBalance);
        } catch (err) {
          console.error("[chat] Failed to fetch YNAB data:", err);
        }
      }
    }

    // Fallback if no YNAB data
    if (!context) {
      console.warn("[chat] Using empty context, no YNAB data available");
      context = {
        totalBalance: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        upcomingBills: [],
        recentTransactions: [],
        debts: [],
        investments: [],
        savingGoal: 0,
        incomeSources: [],
        dailyBudget: 0,
        daysUntilNextIncome: 0,
        availableBeforePayday: 0,
        dailySpendableBeforePayday: 0,
        monthlyHistory: [],
        savingsGoals: [],
        accounts: [],
        locale: "en",
        householdProfile: "",
        currentUser: "unknown",
      };
    }

    // Auto-add expense(s) if image attached, BEFORE calling AI so it knows
    let expenseContext = "";
    if (image && image_media_type && add_expense && user) {
      try {
        console.info("[chat] Attempting to auto-add expenses from image");
        const { queryClaudeWithImage } = await import("@/lib/ai/claude-image");
        const parseResult = await queryClaudeWithImage(
          `Extract ALL transactions/expenses from this image. For each: amount (number only), payee/store name.
If single receipt, return one item. If bank statement or multiple items, return ALL.
Reply with ONLY a valid JSON array: [{"amount":"...","payee":"..."}]`,
          image,
          image_media_type,
          30000
        );

        let transactions: { amount: string; payee: string }[] = [];
        try {
          const arrayMatch = parseResult.text.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            transactions = JSON.parse(arrayMatch[0]);
          } else {
            const objMatch = parseResult.text.match(/\{[\s\S]*\}/);
            if (objMatch) transactions = [JSON.parse(objMatch[0])];
          }
        } catch {
          console.warn("[chat] Failed to parse receipt JSON:", parseResult.text);
        }

        if (transactions.length > 0) {
          const linkedAcc = getDb()
            .prepare("SELECT ynab_account_id FROM user_linked_accounts WHERE user_id = ? LIMIT 1")
            .get(user.id) as { ynab_account_id: string } | undefined;

          if (linkedAcc) {
            const added: string[] = [];
            const failed: string[] = [];

            for (const tx of transactions) {
              if (!tx.amount || !tx.payee) continue;
              try {
                const txRes = await fetch(new URL("/api/ynab/transaction", request.url).toString(), {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    cookie: request.headers.get("cookie") || "",
                  },
                  body: JSON.stringify({
                    account_id: linkedAcc.ynab_account_id,
                    amount: String(tx.amount).replace(",", "."),
                    payee_name: tx.payee,
                  }),
                });
                if (txRes.ok) {
                  added.push(`${tx.amount} euros from ${tx.payee}`);
                  console.info("[chat] Auto-added expense:", tx.payee, tx.amount);
                } else {
                  failed.push(`${tx.payee} (${tx.amount})`);
                }
              } catch {
                failed.push(`${tx.payee} (${tx.amount})`);
              }
            }

            if (added.length > 0) {
              expenseContext = `SYSTEM NOTE: You successfully added ${added.length} expense(s) to YNAB: ${added.join("; ")}. Confirm this naturally in your response, listing what was added. Do NOT say you cannot add expenses.`;
              // Trigger background sync
              fetch(new URL("/api/ynab/sync", request.url).toString(), {
                method: "POST",
                headers: { cookie: request.headers.get("cookie") || "" },
              }).catch((err) => console.warn("[chat] Background sync after expense failed:", err));
            }
            if (failed.length > 0) {
              expenseContext += ` Failed to add: ${failed.join("; ")}.`;
            }
          }
        }
      } catch (err) {
        console.warn("[chat] Auto-add expense failed:", err);
      }
    }

    // Append expense context to the last user message so AI knows what happened
    const messagesWithContext = [...messages];
    if (expenseContext && messagesWithContext.length > 0) {
      const last = messagesWithContext[messagesWithContext.length - 1];
      if (last.role === "user") {
        messagesWithContext[messagesWithContext.length - 1] = {
          ...last,
          content: last.content + "\n\n" + expenseContext,
        };
      }
    }

    const fullResponse = await getFinancialAdvice(messagesWithContext, context, image, image_media_type);

    // Save assistant response to DB for persistence
    if (user && fullResponse) {
      try {
        const chatDb = getDb();
        chatDb.prepare("INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)")
          .run(user.id, "assistant", fullResponse);
        console.info("[chat] Saved assistant response to DB");
        const lastId = chatDb.prepare("SELECT last_insert_rowid() as id").get() as { id: number };
        eventBus.emit("chat:message", {
          id: lastId.id,
          role: "assistant",
          content: fullResponse,
          sender: null,
          userId: null,
        });
      } catch (err) {
        console.error("[chat] Failed to save response to DB:", err);
      }
    }

    return NextResponse.json({ message: fullResponse });
  } catch (error) {
    console.error("[chat] API error:", error);
    return NextResponse.json(
      { message: "Sorry, something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
