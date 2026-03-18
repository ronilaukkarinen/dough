import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

interface FinancialContext {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  upcomingBills: { name: string; amount: number; dueDay: number }[];
  recentTransactions: { date: string; payee: string; amount: number; category: string }[];
  debts: { name: string; remaining: number; rate: number }[];
  dailyBudget: number;
  daysUntilNextIncome: number;
  locale: string;
}

function buildSystemPrompt(ctx: FinancialContext): string {
  const lang = ctx.locale === "fi"
    ? "Respond in Finnish. Be natural and conversational."
    : "Respond in English. Be natural and conversational.";

  return `You are Dough, a personal AI financial advisor for a Finnish family. You have access to their real financial data from YNAB.

${lang}

Current financial snapshot:
- Total balance across all accounts: ${ctx.totalBalance} euros
- Daily budget (safe to spend per day): ${ctx.dailyBudget} euros
- Days until next income: ${ctx.daysUntilNextIncome}
- Monthly income: ${ctx.monthlyIncome} euros
- Monthly expenses so far: ${ctx.monthlyExpenses} euros

Upcoming bills this month:
${ctx.upcomingBills.map(b => `- ${b.name}: ${b.amount} euros (due ${b.dueDay}th)`).join("\n")}

Recent transactions (last 10):
${ctx.recentTransactions.slice(0, 10).map(t => `- ${t.date}: ${t.payee} - ${Math.abs(t.amount)} euros (${t.category})`).join("\n")}

Debts:
${ctx.debts.map(d => `- ${d.name}: ${d.remaining} euros remaining (${d.rate}% APR)`).join("\n")}

Guidelines:
- Be direct and honest about their financial situation
- When they ask "can we afford X?", check the daily budget and upcoming bills before answering
- Give specific numbers, not vague advice
- If things are tight, say so clearly but without being preachy
- Suggest specific actionable steps when relevant
- Keep responses concise - 2-4 sentences for simple questions, more for complex analysis
- Use euro sign for all amounts
- Remember this is a household with two people - spending decisions affect both`;
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
    console.info("[ai] Calling claude CLI for financial advice");
    const claudePath = process.env.CLAUDE_PATH || "/home/rolle/.local/bin/claude";
    const { stdout } = await execFileAsync(claudePath, ["-p", prompt], {
      timeout: 60000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, CLAUDE_CODE_ENTRYPOINT: "cli" },
    });

    const response = stdout.trim();
    if (!response) {
      console.warn("[ai] Empty response from claude CLI");
      return "Sorry, I could not generate a response. Please try again.";
    }

    console.info("[ai] Got response from claude CLI, length:", response.length);
    return response;
  } catch (error) {
    console.error("[ai] Claude CLI error:", error);
    return "Sorry, something went wrong with the AI advisor. Please try again.";
  }
}
