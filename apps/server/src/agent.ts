import "dotenv/config";
import { db, tickets, conversations } from "@jaicome-internship/db";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { z } from "zod";
import { nanoid } from "nanoid";
import { Hono } from "hono";
import "@jaicome-internship/env/server";

const agentRoutes = new Hono();

const ticketSchema = z.object({
  title: z.string(),
  description: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  reproSteps: z.string(),
});

function getGroq() {
  return createGroq({
    apiKey: process.env.GROQ_API_KEY ?? "",
  });
}

function buildSystemPrompt(
  pageContext: { path: string; title: string; textContent?: string },
  logs: Array<{ type: string; level: string; message: string; timestamp: string; url?: string; status?: number }>
): string {
  const logsText =
    logs.length > 0
      ? logs
          .map(
            (l) =>
              `[${l.timestamp}] ${l.type.toUpperCase()} ${l.level.toUpperCase()}: ${l.message}${l.status ? ` (HTTP ${l.status})` : ""}`
          )
          .join("\n")
      : "No logs captured.";

  const pageContentText = pageContext.textContent
    ? `\nPage content snapshot:\n${pageContext.textContent}`
    : "";

  return `You are a support agent embedded in a web application.
The user is on page: ${pageContext.path} (${pageContext.title})${pageContentText}

Captured browser logs:
${logsText}

Your job:
- Chat with the user to understand their issue
- Ask clarifying questions if needed — never create a ticket from a vague one-line message
- Once you have enough information, generate a structured ticket

Rules for BUG tickets:
- If logs are present, reference them in your response and use them to detect severity
- console.error and 5xx responses = high severity
- console.warn and 4xx responses = medium severity
- If NO logs exist, ask targeted questions: what happened, what was expected, what steps led there
- Never create a bug ticket without repro steps

Rules for FEATURE REQUEST tickets:
- Do not ask about logs
- Collect: what they want, why they want it, what problem it solves
- Severity is always low
- Ask follow-up questions until you have all three

When you have enough info to create a ticket, respond with ONLY this JSON format and nothing else:
TICKET_READY:{"title":"...","description":"...","severity":"low|medium|high","reproSteps":"..."}

Otherwise respond conversationally to gather more information.`;
}

agentRoutes.post("/chat", async (c) => {
  try {
    const body = await c.req.json();
    const { messages, logs, pageContext } = body;

    const systemPrompt = buildSystemPrompt(pageContext, logs);

    const result = await generateText({
      model: getGroq()("llama-3.1-8b-instant"),
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  })),
  maxTokens: 500,
});

const responseText = result.text;

    if (responseText.startsWith("TICKET_READY:")) {
      try {
        const jsonStr = responseText.replace("TICKET_READY:", "").trim();
        const draft = JSON.parse(jsonStr);
        const validated = ticketSchema.parse(draft);

        return c.json({
          message: "I've drafted a ticket based on our conversation. Please review and edit the details before submitting.",
          ticketDraft: validated,
        });
      } catch {
        return c.json({ message: responseText });
      }
    }

    return c.json({ message: responseText });
  } catch (error) {
    console.error("Agent chat error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

agentRoutes.post("/submit", async (c) => {
  const session = c.get("session" as never) as { user?: { id: string } } | null;
  const userId = session?.user?.id ?? "anonymous";

  const body = await c.req.json();
  const { title, description, severity, reproSteps, rawLogs, messages } = body;

  const ticketId = nanoid();
  const now = new Date().toISOString();

  await db.insert(tickets).values({
    id: ticketId,
    userId,
    title,
    description,
    severity,
    reproSteps,
    rawLogs,
    status: "open",
    createdAt: now,
  });

  for (const message of messages) {
    await db.insert(conversations).values({
      id: nanoid(),
      ticketId,
      role: message.role,
      content: message.content,
      createdAt: now,
    });
  }

  return c.json({ ticketId, success: true });
});

export { agentRoutes };

