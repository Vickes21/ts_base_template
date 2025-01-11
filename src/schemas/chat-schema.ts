import { messageSchema } from "src/schemas/message-schema";
import { z } from "zod";

export const chatSchema = z.object({
  id: z.string(),
  userId: z.number(),
  title: z.string(),
  messages: z.array(messageSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type TChat = z.infer<typeof chatSchema>