import { db, tickets, conversations } from "@jaicome-internship/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const ticketsRouter = {
  createTicket: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        severity: z.enum(["low", "medium", "high"]),
        reproSteps: z.string().optional(),
        rawLogs: z.string().optional(),
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
      })
    )
    .handler(async ({ input, context }) => {
      const ticketId = nanoid();
      const now = new Date().toISOString();

      await db.insert(tickets).values({
        id: ticketId,
        userId: context.session.user.id,
        title: input.title,
        description: input.description,
        severity: input.severity,
        reproSteps: input.reproSteps,
        rawLogs: input.rawLogs,
        status: "open",
        createdAt: now,
      });

      for (const message of input.messages) {
        await db.insert(conversations).values({
          id: nanoid(),
          ticketId,
          role: message.role,
          content: message.content,
          createdAt: now,
        });
      }

      return { ticketId };
    }),

  getTickets: protectedProcedure.handler(async ({ context }) => {
    const result = await db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, context.session.user.id));
    return result;
  }),
};