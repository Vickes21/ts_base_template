
import { tool } from "@langchain/core/tools";
import { ChatwootAPI } from "src/lib/chatwoot";
import { z } from "zod";

export const getMessages = tool(async (params, config) => {
  if (!config.metadata.accountId || !config.metadata.accessToken) {
    throw new Error("Missing Chatwoot API credentials");
  }

  console.log('[getMessages] params:', params);


  const api = new ChatwootAPI({
    accountId: config.metadata.accountId,
    userAccessToken: config.metadata.accessToken,
  })

  const response = await api.getMessages(params.conversationId)
  console.log('[getMessages] response:', response);

  return {
    contact: {
      id: response.data.meta.contact.id,
      email: response.data.meta.contact.email,
      name: response.data.meta.contact.name,
      phone: response.data.meta.contact.phone_number,
    },
    messages: response.data.payload.map((message: any) => ({
      id: message.id,
      content: message.content,
      message_type: message.message_type,
      status: message.status,
      created_at: message.created_at,
      sender: {
        name: message.sender.name,
        email: message.sender.email,
        phone: message.sender.phone_number,
        type: message.sender.type,
      }
    })),
  }
}, {
  name: 'get_messages',
  description: 'Obtém mensagens de uma conversa específica, passando como parâmetro o ID da conversa.',
  schema: z.object({
    conversationId: z.number().describe('ID da conversa a ser consultada.'),
  }),
})
