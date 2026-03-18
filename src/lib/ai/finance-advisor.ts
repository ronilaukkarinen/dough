import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
- Total balance across all accounts: €${ctx.totalBalance.toLocaleString()}
- Daily budget (safe to spend per day): €${ctx.dailyBudget}
- Days until next income: ${ctx.daysUntilNextIncome}
- Monthly income: €${ctx.monthlyIncome.toLocaleString()}
- Monthly expenses so far: €${ctx.monthlyExpenses.toLocaleString()}

Upcoming bills this month:
${ctx.upcomingBills.map(b => `- ${b.name}: €${b.amount} (due ${b.dueDay}th)`).join("\n")}

Recent transactions (last 10):
${ctx.recentTransactions.slice(0, 10).map(t => `- ${t.date}: ${t.payee} — €${Math.abs(t.amount)} (${t.category})`).join("\n")}

Debts:
${ctx.debts.map(d => `- ${d.name}: €${d.remaining.toLocaleString()} remaining (${d.rate}% APR)`).join("\n")}

Guidelines:
- Be direct and honest about their financial situation
- When they ask "can we afford X?", check the daily budget and upcoming bills before answering
- Give specific numbers, not vague advice
- If things are tight, say so clearly but without being preachy
- Suggest specific actionable steps when relevant
- Keep responses concise — 2-4 sentences for simple questions, more for complex analysis
- Use € for all amounts
- Remember this is a household with two people — spending decisions affect both`;
}

export async function getFinancialAdvice(
  messages: { role: "user" | "assistant"; content: string }[],
  context: FinancialContext
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: buildSystemPrompt(context),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "I couldn't generate a response. Please try again.";
}
