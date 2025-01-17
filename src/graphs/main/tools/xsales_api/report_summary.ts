import { ChatwootAPI } from "src/lib/chatwoot";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Command } from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";

export const getSummaryReport = tool(async ({ filters }, config) => {
  if (!config.configurable.user.account_id || !config.configurable.user.access_token) {
    throw new Error("Missing Chatwoot API credentials");
  }

  console.log('[getSummaryReport] filters:', filters);


  const api = new ChatwootAPI({
    accountId: config.configurable.user.account_id,
    userAccessToken: config.configurable.user.access_token,
  })

  const data = await api.getSummaryReport(filters);

  console.log('[getSummaryReport] response:', data);

  return new Command({
    update: {
      data: {
        summary: data,
      },
      messages: [
        new ToolMessage({
          content: JSON.stringify(data, null, 2),
          tool_call_id: config.toolCall.id,
        }),
      ],
    }
  })
}, {
  name: 'get_summary_report',
  description: 'Obtém um relatório sumarizado da conta, que contém informações como quantidade de conversas, tempo médio de resposta, tempo médio de resolução, quantidade de resoluções, tempo médio de resposta anterior, entre outros.',
  schema: z.object({
    return_direct: z.boolean().default(true).describe('Sempre será true'),
    filters: z.object({
      period: z.enum(["today", "last_7_days", "last_month", "last_3_months", "last_6_months", "last_year"]).describe("Intervalo de tempo para filtrar os dados."),
    }).describe("Filtro de busca."),
  }),
})

