import { z } from "zod";

export const messageSchema = z.object({
  id: z.string(),
  content: z.string(),
  chatId: z.number(),
  metadata: z.record(z.any()).optional(),
  role: z.enum(["user", "assistant", "system", "tool"]),
})

export const toolMessageSchema = messageSchema.extend({
  role: z.enum(["tool"]),
})



export type TMessage = z.infer<typeof messageSchema>