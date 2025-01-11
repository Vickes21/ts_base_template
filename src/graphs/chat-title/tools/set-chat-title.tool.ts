import { ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { XSalesAPI } from "src/lib/xsales";
import { z } from "zod";

export const setChatTitleTool = tool(async ({ title }, config) => {
  const api = new XSalesAPI()
  const chatId = config.configurable.chatId
  if (!chatId) {
    return "ChatId is required"
  }
  await api.updateChat(chatId, {
    title: title
  })

  return new Command({
    update: {
      chatTitle: title,
      messages: [
        new ToolMessage({
          content: "Chat title updated to: " + title,
          tool_call_id: config.toolCall.id,
        }),
      ],
    },
  })
}, {
  name: "SetChatTitle",
  description: "Utilize esta função para dar um título ao chat passando o nome por parâmetro",
  schema: z.object({
    title: z.string().min(1).max(100).describe("Título do chat")
  })
})