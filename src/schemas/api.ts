import { z } from "zod";

export const setChatTitleApiParamsSchema = z.object({
  chatId: z.number().int().positive().describe("Id do chat"),
})