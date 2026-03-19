import { spawn } from "child_process";
import { getHouseholdSetting } from "@/lib/household";
import { DEFAULT_CHAT_GUIDELINES } from "./default-prompts";

interface FinancialContext {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  upcomingBills: { name: string; amount: number; dueDay: number; status?: string }[];
  recentTransactions: { date: string; payee: string; amount: number; category: string }[];
  debts: { name: string; remaining: number; rate: number; minimumPayment?: number }[];
  investments: { name: string; balance: number; monthlyContribution: number; expectedReturn: number }[];
  savingGoal: number;
  incomeSources: { name: string; amount: number; expectedDay: number }[];
  dailyBudget: number;
  daysUntilNextIncome: number;
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

IMPORTANT: Income often arrives late in the month. Do NOT compare "received so far" to "total expenses" to conclude overspending. Compare EXPECTED TOTAL monthly income to expenses.

Current financial snapshot:
- Checking+savings balance: ${ctx.totalBalance} euros
- Daily budget (safe to spend per day): ${ctx.dailyBudget} euros
- Days left in month: ${ctx.daysUntilNextIncome}
- Income RECEIVED so far this month: ${ctx.monthlyIncome} euros
- Total EXPECTED monthly income: ${ctx.incomeSources.reduce((s, i) => s + i.amount, 0)} euros
- Income sources: ${ctx.incomeSources.map(i => `${i.name}: ${i.amount} euros (day ${i.expectedDay})`).join(", ") || "none configured"}
- Monthly expenses so far (excluding transfers): ${ctx.monthlyExpenses} euros

Upcoming bills this month:
${ctx.upcomingBills.length > 0 ? ctx.upcomingBills.map(b => `- ${b.name}: ${b.amount} euros (due ${b.dueDay}th${b.status ? ` - ${b.status.toUpperCase()}` : ""})`).join("\n") : "- None configured"}

Recent transactions (last 10, with dates):
${ctx.recentTransactions.slice(0, 10).map(t => `- ${t.date}: ${t.payee} - ${Math.abs(t.amount)} euros (${t.category})`).join("\n")}

Debts:
${ctx.debts.length > 0 ? ctx.debts.map(d => `- ${d.name}: ${d.remaining} euros remaining${d.rate > 0 ? ` (${d.rate}% APR)` : ""}${d.minimumPayment ? `, ${d.minimumPayment} euros/month` : ""}`).join("\n") : "- None"}

Investments:
${ctx.investments.length > 0 ? ctx.investments.map(i => `- ${i.name}: ${i.balance} euros${i.monthlyContribution > 0 ? `, ${i.monthlyContribution} euros/month contribution` : ""}${i.expectedReturn > 0 ? `, ${i.expectedReturn}% expected return` : ""}`).join("\n") : "- None"}

${ctx.savingGoal > 0 ? `Savings goal: ${ctx.savingGoal} euros/month` : ""}

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
  context: FinancialContext
): Promise<string> {
  const prompt = buildPrompt(messages, context);

  try {
    console.info("[ai] Calling claude CLI via stdin pipe");
    const claudePath = process.env.CLAUDE_PATH || "claude";

    const response = await new Promise<string>((resolve, reject) => {
      const proc = spawn(claudePath, ["-p", "-"], {
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
