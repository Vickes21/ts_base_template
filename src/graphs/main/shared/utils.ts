import { BaseMessage } from "@langchain/core/messages";
import { Annotation, END } from "@langchain/langgraph";

export const members = [
  "DataFetcherAgent",
  "AnalysisAndInsightAgent",
  "CommunicationAgent"
] as const;

export const options = [...members];

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
  instructions: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  goal: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  data: Annotation<any>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  })
});

export const log = (agent: string, x: any) => {
  console.log(`[${agent}]`, x);
  return x;
}

export const apiEndpointsSpecs = {
  reports_summary: {
    description: 'Obtém um relatório sumarizado da conta, que contém informações como quantidade de conversas, tempo médio de resposta, tempo médio de resolução, quantidade de resoluções, tempo médio de resposta anterior, entre outros.',
    params: {
      period: 'Período do relatório. Pode ser "today", "last_7_days", "last_month", "last_3_months", "last_6_months" ou "last_year".'
    }
  },
  list_conversations: {
    description: 'Obtém uma lista de conversas da conta. Cada requisição contém 25 conversas, que podem ser paginadas.',
    params: {
      include_messages: 'Incluir mensagens das conversas. Pode ser "true" ou "false". (OPCIONAL)',
      assignee_type: 'Atribuição da conversa. Pode ser "all", "unassigned", "assigned" ou "me". (OPCIONAL)',
      status: 'Status da conversa. Pode ser "snoozed", "open", "resolved" ou "pending". (OPCIONAL)',
      q: 'Termo a ser buscado nas conversas. (OPCIONAL)',
      labels: 'Filtros de etiquetas. (OPCIONAL)',
      page: 'Número da página a ser retornada. (OPCIONAL)',
      sort_by: 'Ordenação das conversas (OPCIONAL). Pode ser:\n' +
        ' - "last_activity_at_desc"Pode ser "last_activity_at_desc" (para Ultima Atividade: Recentes primeiro),\n' +
        ' - "created_at_desc" (para Criado em: Recentes primeiro),\n' +
        ' - "created_at_asc" (para Criado em: Antigos primeiro),\n' +
        ' - "priority_desc" (para Prioridade: Alta primeiro),\n' +
        ' - "priority_asc" (para Prioridade: Baixa primeiro),\n' +
        ' - "waiting_since_asc" (para Aguardando desde: Antigos primeiro),\n' +
        ' - "waiting_since_desc" (para Aguardando desde: Recentes primeiro).'
    }
  },
}