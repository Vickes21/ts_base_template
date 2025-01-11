import { ChatwootAPI } from "src/lib/chatwoot";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Command } from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";
import { log } from "src/graphs/main/shared/utils";

export const listConversations = tool(async (params, config) => {
  if (!config.configurable.user.account_id || !config.configurable.user.access_token) {
    throw new Error("Missing Chatwoot API credentials");
  }

  console.log('[listConversations] params:', params);


  const api = new ChatwootAPI({
    accountId: config.configurable.user.account_id,
    userAccessToken: config.configurable.user.access_token,
  })

  const response = await api.listConversations(params)
  //now clear some data
  const data = []
  const conversations = response.data.payload

  console.log('[listConversations] conversations:', conversations.length);
  for (const conversation of conversations) {
    const messagesResponse = await api.getMessages(conversation.id)
    // console.log('[listConversations] messagesResponse:');
    // console.dir(messagesResponse, { depth: null });
    const messages = []

    for (const message of messagesResponse.payload) {
      if (message.message_type === 2) {
        //jump to next iteration
        continue
      }
      if (message.content && message.content.includes('Evolution Desconectado')) {
        //jump to next iteration
        continue
      }
      messages.push({
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
      })
    }
    
    data.push({
      id: conversation.id,
      contact: {
        id: messagesResponse.meta.contact.id,
        email: messagesResponse.meta.contact.email,
        name: messagesResponse.meta.contact.name,
        phone: messagesResponse.meta.contact.phone_number,
      },
      messages: messages,
      labels: conversation.labels,
      status: conversation.status,
      created_at: conversation.created_at,
      first_reply_created_at: conversation.first_reply_created_at,
      unread_count: conversation.unread_count,
      last_activity_at: conversation.last_activity_at,
      waiting_since: conversation.waiting_since,
    })
  }

  // parsear as mensagens
  const formattedMessages: { [key: string]: string[] } = {}
  
  for (const conversation of data) {
    formattedMessages[conversation.id] = []
    const messages = conversation.messages
    for (const message of messages) {
      //push formatted message string
      formattedMessages[conversation.id].push(
        `${message.sender.name}: ${message.content}`
      )
    }
  }

  // console.log('[listConversations] formattedMessages:', formattedMessages);

  // console.log('[listConversations] response:', data);
  return new Command({
    update: {
      data: {
        conversations: formattedMessages,
      },
      messages: [
        new ToolMessage({
          content: JSON.stringify(formattedMessages, null, 2),
          tool_call_id: config.toolCall.id,
        }),
      ],
    }
  })
}, {
  name: 'list_conversations',
  description: 'Obtém uma lista de conversas da conta. Cada requisição contém 25 conversas, que podem ser paginadas.',
  schema: z.object({
    return_direct: z.boolean().default(true).describe('Sempre será true'),
    include_messages: z.boolean().describe('Incluir mensagens das conversas. Pode ser "true" ou "false".').default(true),
    assignee_type: z.enum(['all', 'unassigned', 'assigned', 'me']).describe('Atribuição da conversa. Pode ser "all", "unassigned", "assigned" ou "me".').nullable(),
    status: z.enum(['snoozed', 'open', 'resolved', 'pending']).describe('Status da conversa. Pode ser "snoozed", "open", "resolved" ou "pending".').nullable(),
    q: z.string().describe('Termo textual a ser buscado nas conversas.').nullable(),
    labels: z.array(z.string()).describe('Filtros de etiquetas, opcionais.').nullable(),
    page: z.number().default(1).nullable().describe('Número da página a ser retornada.'),
    sort_by: z.enum(['last_activity_at_desc', 'created_at_desc', 'created_at_asc', 'priority_desc', 'priority_asc', 'waiting_since_asc', 'waiting_since_desc']).nullable().default('last_activity_at_desc').describe('Ordenação das conversas.'),
  }),
})
