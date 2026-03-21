import { spawn } from "child_process";
import { getHouseholdSetting } from "@/lib/household";
import { DEFAULT_CHAT_GUIDELINES } from "./default-prompts";

interface FinancialContext {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  upcomingBills: { name: string; amount: number; dueDay: number; status?: string }[];
  recentTransactions: { date: string; payee: string; amount: number; category: string }[];
  debts: { name: string; remaining: number; rate: number; minimumPayment?: number; dueDay?: number }[];
  investments: { name: string; balance: number; monthlyContribution: number; expectedReturn: number }[];
  savingGoal: number;
  incomeSources: { name: string; amount: number; expectedDay: number }[];
  dailyBudget: number;
  daysUntilNextIncome: number;
  availableBeforePayday: number;
  dailySpendableBeforePayday: number;
  monthlyHistory: { month: string; income: number; expenses: number; net: number }[];
  savingsGoals: { name: string; target: number; saved: number; priority: string; targetDate: string | null }[];
  accounts: { name: string; balance: number; type: string; note: string }[];
  locale: string;
  householdProfile: string;
  currentUser: string;
}

function buildSystemPrompt(ctx: FinancialContext): string {
  const lang = ctx.locale === "fi"
    ? "Respond in Finnish. Be natural and conversational."
    : "Respond in English. Be natural and conversational.";

  const now = new Date();
  const dateStr = `${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}`;
  const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

  return `You are Dough, a personal AI financial advisor.${ctx.householdProfile ? ` Household: ${ctx.householdProfile}.` : ""} You have access to their real financial data.

The person currently chatting is: ${ctx.currentUser}. This is a shared chat visible to all household members. Address the person by name when relevant.

${lang}

Current date and time: ${dateStr} ${timeStr} (Europe/Helsinki)

CRITICAL RULES FOR CALCULATIONS:
- Money that has NOT arrived yet is NOT available to spend. Salary on the last day of the month is essentially next month's money.
- The daily budget below is the SAME number shown on the user's dashboard. USE THIS NUMBER for per-day spending advice. Do not calculate your own.
- Bills and debt payments listed below will come out of the balance separately — the daily budget already accounts for the saving goal but NOT for upcoming bills/debts. Mention those separately when relevant.
- Income arrives at specific dates. Do not pool all future income together.

Current financial snapshot:
- Checking+savings balance: ${ctx.totalBalance} euros
- ** DAILY BUDGET: ${ctx.dailyBudget} euros/day ** (cash flow simulation: walks each future day, tracks balance as income arrives and obligations are paid, then takes the tightest point — the minimum affordable daily spend across all remaining days. This prevents future salary from inflating today's budget. USE THIS NUMBER.)
- With upcoming income before payday: ${ctx.dailySpendableBeforePayday} euros/day (adds expected income arriving before month end)
- Days left in month: ${ctx.daysUntilNextIncome}
- Income RECEIVED so far this month: ${ctx.monthlyIncome} euros
- Total EXPECTED monthly income: ${ctx.incomeSources.reduce((s, i) => s + i.amount, 0)} euros
- Income sources: ${ctx.incomeSources.map(i => `${i.name}: ${i.amount} euros (day ${i.expectedDay})`).join(", ") || "none configured"}
- Monthly expenses so far (excluding transfers): ${ctx.monthlyExpenses} euros

${ctx.accounts.length > 0 ? `Accounts:
${ctx.accounts.map(a => `- ${a.name}: ${a.balance} euros (${a.type})${a.note ? ` — ${a.note}` : ""}`).join("\n")}` : ""}

Upcoming bills this month:
${ctx.upcomingBills.length > 0 ? ctx.upcomingBills.map(b => `- ${b.name}: ${b.amount} euros (due ${b.dueDay}th${b.status ? ` - ${b.status.toUpperCase()}` : ""})`).join("\n") : "- None configured"}

Recent transactions (last 10, with dates):
${ctx.recentTransactions.slice(0, 10).map(t => `- ${t.date}: ${t.payee} - ${Math.abs(t.amount)} euros (${t.category})`).join("\n")}

Debts:
${ctx.debts.length > 0 ? ctx.debts.map(d => `- ${d.name}: ${d.remaining} euros remaining${d.rate > 0 ? ` (${d.rate}% APR)` : ""}${d.minimumPayment ? `, ${d.minimumPayment} euros/month` : ""}${d.dueDay ? ` (due ${d.dueDay}th)` : ""}`).join("\n") : "- None"}

Investments:
${ctx.investments.length > 0 ? ctx.investments.map(i => `- ${i.name}: ${i.balance} euros${i.monthlyContribution > 0 ? `, ${i.monthlyContribution} euros/month contribution` : ""}${i.expectedReturn > 0 ? `, ${i.expectedReturn}% expected return` : ""}`).join("\n") : "- None"}

${ctx.savingGoal > 0 ? `Savings goal: ${ctx.savingGoal} euros/month` : ""}

${ctx.savingsGoals.length > 0 ? `Savings goals:
${ctx.savingsGoals.map(g => `- ${g.name}: ${g.saved}/${g.target} euros (${g.priority})${g.targetDate ? ` by ${g.targetDate}` : ""}`).join("\n")}` : ""}

${ctx.monthlyHistory.length > 0 ? `Previous months (for trends/comparisons):
${ctx.monthlyHistory.map(m => `- ${m.month}: income ${m.income} euros, expenses ${m.expenses} euros, net ${m.net} euros`).join("\n")}` : ""}

IMPORTANT: When users attach a receipt/image and ask you to add an expense, the system automatically adds it to YNAB before you respond. Look for "SYSTEM NOTE" in the user message for the result. Confirm naturally what was added, do NOT say you cannot add expenses.

Guidelines:
${getHouseholdSetting("prompt_chat_guidelines") || DEFAULT_CHAT_GUIDELINES}`;
}

function buildPrompt(
  messages: { role: "user" | "assistant"; content: string }[],
  context: FinancialContext
): string {
  const systemPrompt = buildSystemPrompt(context);
  const conversation = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  return `${systemPrompt}\n\nConversation so far:\n${conversation}\n\nRespond as the assistant:`;
}

export async function getFinancialAdvice(
  messages: { role: "user" | "assistant"; content: string }[],
  context: FinancialContext,
  image?: string,
  imageMediaType?: string
): Promise<string> {
  const prompt = buildPrompt(messages, context);
  const claudePath = process.env.CLAUDE_PATH || "claude";

  // If image attached, use stream-json format for multimodal
  if (image && imageMediaType) {
    console.info("[ai] Calling claude CLI with image via stream-json");
    const { queryClaudeWithImage } = await import("./claude-image");
    const result = await queryClaudeWithImage(prompt, image, imageMediaType, 120000);
    if (result.error) {
      console.error("[ai] Image query error:", result.error);
      return "Sorry, something went wrong with the AI advisor. Please try again.";
    }
    return result.text;
  }

  try {
    console.info("[ai] Calling claude CLI via stdin pipe");

    const response = await new Promise<string>((resolve, reject) => {
      const proc = spawn(claudePath, ["-p", "--model", "opus", "-"], {
        env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: "cli" },
        timeout: 120000,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => { stdout += data.toString(); });
      proc.stderr.on("data", (data) => { stderr += data.toString(); });

      proc.on("close", (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`claude exited with code ${code}: ${stderr}`));
        }
      });

      proc.on("error", reject);

      proc.stdin.write(prompt);
      proc.stdin.end();
    });

    console.info("[ai] Got response from claude CLI, length:", response.length);
    return response;
  } catch (error) {
    console.error("[ai] Claude CLI error:", error);
    return "Sorry, something went wrong with the AI advisor. Please try again.";
  }
}
