'use strict';

var module$1 = require('module');
var fastify = require('fastify');
var langgraph = require('@langchain/langgraph');
var messages = require('@langchain/core/messages');
var prebuilt = require('@langchain/langgraph/prebuilt');
var hub = require('langchain/hub');
var tools = require('@langchain/core/tools');
var axios = require('axios');
var zod = require('zod');
var openai = require('@langchain/openai');
var fastifyIO = require('fastify-socket.io');
var dispatch = require('@langchain/core/callbacks/dispatch');
var output_parsers = require('@langchain/core/output_parsers');
var promises = require('@langchain/core/callbacks/promises');
var cors = require('@fastify/cors');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
var require$1 = (
			false
				? /* @__PURE__ */ module$1.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.js', document.baseURI).href)))
				: require
		);

const ChatTitleState = langgraph.Annotation.Root({
  messages: langgraph.Annotation({
    reducer: langgraph.messagesStateReducer,
    default: () => []
  }),
  chatHistory: langgraph.Annotation({
    reducer: (x, y) => y ?? x ?? "",
    default: () => ""
  }),
  chatTitle: langgraph.Annotation({
    reducer: (x, y) => y ?? x ?? "",
    default: () => ""
  })
});

class XSalesAPI {
  constructor() {
    this._baseUrl = process.env.XSALES_API_URL || "http://localhost:3000";
  }
  async getMessages(chatId) {
    try {
      const response = await axios.get(`${this._baseUrl}/api/messages`, {
        params: {
          chatId
        }
      });
      return response.data;
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        console.error(error.message);
      } else {
        console.error(error);
      }
      throw error;
    }
  }
  async saveMessages(chatId, messages) {
    try {
      await axios.post(`${this._baseUrl}/api/chats/${chatId}/messages`, {
        messages
      });
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        console.error("AxiosError");
      } else {
        console.error(error);
      }
      throw new Error("Error saving messages");
    }
  }
  async updateChat(id, data) {
    try {
      await axios.put(`${this._baseUrl}/api/chats/${id}`, data);
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        console.error("AxiosError");
      } else {
        console.error(error);
      }
      throw new Error("Error updating chat");
    }
  }
}

const setChatTitleTool = tools.tool(async ({ title }, config) => {
  const api = new XSalesAPI();
  const chatId = config.configurable.chatId;
  if (!chatId) {
    return "ChatId is required";
  }
  await api.updateChat(chatId, {
    title
  });
  return new langgraph.Command({
    update: {
      chatTitle: title,
      messages: [
        new messages.ToolMessage({
          content: "Chat title updated to: " + title,
          tool_call_id: config.toolCall.id
        })
      ]
    }
  });
}, {
  name: "SetChatTitle",
  description: "Utilize esta fun\xE7\xE3o para dar um t\xEDtulo ao chat passando o nome por par\xE2metro",
  schema: zod.z.object({
    title: zod.z.string().min(1).max(100).describe("T\xEDtulo do chat")
  })
});

const gpt4oMiniLlm = new openai.ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0
});
new openai.ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0
});

const nameChatNode = async (state, config) => {
  console.log("nameChatNode", "- init name chat node");
  const prompt = await hub.pull("xsales-chat-title");
  const agent = prebuilt.createReactAgent({
    llm: gpt4oMiniLlm,
    tools: [
      setChatTitleTool
    ],
    stateSchema: ChatTitleState,
    stateModifier: await prompt.partial({})
  });
  const humanMessage = new messages.HumanMessage({
    content: `Conversas do Chat: ${state.chatHistory}`
  });
  const result = await agent.invoke({
    messages: [
      humanMessage
    ]
  }, config);
  const lastMessage = result.messages[result.messages.length - 1];
  return {
    chatTitle: result.chatTitle,
    messages: [
      lastMessage
    ]
  };
};

const chatTitleGraph = async (plot = false) => {
  const workflow = new langgraph.StateGraph(ChatTitleState).addNode("ChatNameAgent", nameChatNode).addEdge(langgraph.START, "ChatNameAgent").addEdge("ChatNameAgent", langgraph.END);
  const graph = workflow.compile();
  if (plot) {
    const drawableGraph = await graph.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    const fs = require$1("fs");
    fs.writeFileSync(__dirname + "/name-chat.png", Buffer.from(arrayBuffer));
  }
  return graph;
};

const chatTitlePipeline = async ({
  chatId
}) => {
  const graph = await chatTitleGraph();
  const api = new XSalesAPI();
  const chatMessages = await api.getMessages(chatId);
  console.log("messages get", chatMessages);
  const chatHistory = chatMessages.map((message) => {
    switch (message.role) {
      case "user":
        return `User: ${message.content}`;
      case "assistant":
        return `CommunicationAgent: ${message.content}`;
    }
  }).join("\n");
  const response = await graph.invoke({
    chatHistory
  }, {
    configurable: {
      chatId
    }
  });
  return response.chatTitle;
};

const setChatTitleApiParamsSchema = zod.z.object({
  chatId: zod.z.number().int().positive().describe("Id do chat")
});

const router = (fastify, opts, done) => {
  fastify.post("/set-chat-title", async (request, reply) => {
    const parsed = setChatTitleApiParamsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: parsed.error });
    }
    const data = parsed.data;
    const title = await chatTitlePipeline({
      chatId: data.chatId
    });
    return reply.send({ title });
  });
  done();
};

const members = [
  "DataFetcherAgent",
  "AnalysisAndInsightAgent",
  "CommunicationAgent"
];
const AgentState = langgraph.Annotation.Root({
  messages: langgraph.Annotation({
    reducer: (x, y) => x.concat(y),
    default: () => []
  }),
  next: langgraph.Annotation({
    reducer: (x, y) => y ?? x ?? langgraph.END,
    default: () => langgraph.END
  }),
  instructions: langgraph.Annotation({
    reducer: (x, y) => y ?? x ?? "",
    default: () => ""
  }),
  goal: langgraph.Annotation({
    reducer: (x, y) => y ?? x ?? "",
    default: () => ""
  }),
  data: langgraph.Annotation({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({})
  })
});
const log = (agent, x) => {
  console.log(`[${agent}]`, x);
  return x;
};
const apiEndpointsSpecs = {
  reports_summary: {
    description: "Obt\xE9m um relat\xF3rio sumarizado da conta, que cont\xE9m informa\xE7\xF5es como quantidade de conversas, tempo m\xE9dio de resposta, tempo m\xE9dio de resolu\xE7\xE3o, quantidade de resolu\xE7\xF5es, tempo m\xE9dio de resposta anterior, entre outros.",
    params: {
      period: 'Per\xEDodo do relat\xF3rio. Pode ser "today", "last_7_days", "last_month", "last_3_months", "last_6_months" ou "last_year".'
    }
  },
  list_conversations: {
    description: "Obt\xE9m uma lista de conversas da conta. Cada requisi\xE7\xE3o cont\xE9m 25 conversas, que podem ser paginadas.",
    params: {
      include_messages: 'Incluir mensagens das conversas. Pode ser "true" ou "false". (OPCIONAL)',
      assignee_type: 'Atribui\xE7\xE3o da conversa. Pode ser "all", "unassigned", "assigned" ou "me". (OPCIONAL)',
      status: 'Status da conversa. Pode ser "snoozed", "open", "resolved" ou "pending". (OPCIONAL)',
      q: "Termo a ser buscado nas conversas. (OPCIONAL)",
      labels: "Filtros de etiquetas. (OPCIONAL)",
      page: "N\xFAmero da p\xE1gina a ser retornada. (OPCIONAL)",
      sort_by: 'Ordena\xE7\xE3o das conversas (OPCIONAL). Pode ser:\n - "last_activity_at_desc"Pode ser "last_activity_at_desc" (para Ultima Atividade: Recentes primeiro),\n - "created_at_desc" (para Criado em: Recentes primeiro),\n - "created_at_asc" (para Criado em: Antigos primeiro),\n - "priority_desc" (para Prioridade: Alta primeiro),\n - "priority_asc" (para Prioridade: Baixa primeiro),\n - "waiting_since_asc" (para Aguardando desde: Antigos primeiro),\n - "waiting_since_desc" (para Aguardando desde: Recentes primeiro).'
    }
  }
};

const routingTool = {
  name: "route",
  description: "Seleciona o p\u0155oximo agente, passando instru\xE7\xF5es espec\xEDficas a ele sobre o que fazer.",
  schema: zod.z.object({
    // goal: z.string().describe('Objetivo do usuário para esta conversa.'),
    instructions: zod.z.string().describe("Instru\xE7\xF5es a serem seguidas pelo pr\xF3ximo agente, quanto mais detalhadas melhor."),
    next: zod.z.enum([...members])
  })
};

const supervisorNode = async (state, config) => {
  log("supervisor", "- init supervisor node");
  const prompt = await hub.pull("xsales-supervisor");
  const chain = (await prompt.partial({
    user_name: config.configurable.user.name,
    user_email: config.configurable.user.email,
    apiEndpointsSpecs: JSON.stringify(apiEndpointsSpecs, null, 2)
  })).pipe(gpt4oMiniLlm.bindTools(
    [routingTool],
    {
      tool_choice: "route"
    }
  )).pipe((x) => x.tool_calls[0].args);
  return chain;
};

const communicationNode = async (state, config) => {
  log("CommunicationAgent", "- init communication node");
  const prompt = await hub.pull("xsales-communication");
  const chain = prompt.pipe(gpt4oMiniLlm);
  const response = await chain.invoke({
    user_name: config?.configurable?.user.name,
    user_email: config?.configurable?.user.email,
    messages: [
      ...state.messages,
      new messages.SystemMessage({
        content: state.instructions,
        name: "Supervisor"
      })
    ]
  }, {
    tags: ["xsales-communication"]
  });
  console.log("[FINAL RESPONSE]", response.content);
  return {
    messages: [
      response
    ]
  };
};

class ChatwootAPI {
  constructor({ userAccessToken, accountId }) {
    this._baseUrl = "https://app.xsales.agency";
    this._accessToken = userAccessToken;
    this._accountId = accountId;
  }
  async getSummaryReport(filters) {
    try {
      const response = await axios(`${this._baseUrl}/api/v2/accounts/${this._accountId}/reports/summary`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": this._accessToken
        },
        params: {
          ...this._parseFilters(filters),
          type: "account",
          business_hours: false,
          timezone_offset: -3
        }
      });
      return response.data;
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        console.error("Error on getSummaryReport", error.response?.data);
        return error.response?.data;
      }
    }
  }
  async listConversations(filters) {
    Object.keys(filters).forEach((key) => filters[key] == null && delete filters[key]);
    try {
      const response = await axios(`${this._baseUrl}/api/v1/accounts/${this._accountId}/conversations`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": this._accessToken
        },
        params: {
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        console.error("Error on listConversations", error.response?.data);
        return error.response?.data;
      }
    }
  }
  async getMessages(conversationId) {
    try {
      const response = await axios(`${this._baseUrl}/api/v1/accounts/${this._accountId}/conversations/${conversationId}/messages`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": this._accessToken
        }
      });
      return response.data;
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        console.error("Error on getMessages", error.response?.data);
        return error.response?.data;
      }
    }
  }
  //recebe o enum de filters e retorna timestamps range "since" e "until"
  _parseFilters(filters) {
    const now = /* @__PURE__ */ new Date();
    let since = /* @__PURE__ */ new Date();
    switch (filters.period) {
      case "today":
        since.setHours(0, 0, 0, 0);
        break;
      case "last_7_days":
        since.setDate(now.getDate() - 7);
        break;
      case "last_month":
        since.setMonth(now.getMonth() - 1);
        break;
      case "last_3_months":
        since.setMonth(now.getMonth() - 3);
        break;
      case "last_6_months":
        since.setMonth(now.getMonth() - 6);
        break;
      case "last_year":
        since.setFullYear(now.getFullYear() - 1);
        break;
    }
    return {
      since: Math.floor(since.getTime() / 1e3).toString(),
      until: Math.floor(now.getTime() / 1e3).toString()
    };
  }
}

const getMessages = tools.tool(async (params, config) => {
  if (!config.metadata.accountId || !config.metadata.accessToken) {
    throw new Error("Missing Chatwoot API credentials");
  }
  console.log("[getMessages] params:", params);
  const api = new ChatwootAPI({
    accountId: config.metadata.accountId,
    userAccessToken: config.metadata.accessToken
  });
  const response = await api.getMessages(params.conversationId);
  console.log("[getMessages] response:", response);
  return {
    contact: {
      id: response.data.meta.contact.id,
      email: response.data.meta.contact.email,
      name: response.data.meta.contact.name,
      phone: response.data.meta.contact.phone_number
    },
    messages: response.data.payload.map((message) => ({
      id: message.id,
      content: message.content,
      message_type: message.message_type,
      status: message.status,
      created_at: message.created_at,
      sender: {
        name: message.sender.name,
        email: message.sender.email,
        phone: message.sender.phone_number,
        type: message.sender.type
      }
    }))
  };
}, {
  name: "get_messages",
  description: "Obt\xE9m mensagens de uma conversa espec\xEDfica, passando como par\xE2metro o ID da conversa.",
  schema: zod.z.object({
    conversationId: zod.z.number().describe("ID da conversa a ser consultada.")
  })
});

const listConversations = tools.tool(async (params, config) => {
  if (!config.configurable.user.account_id || !config.configurable.user.access_token) {
    throw new Error("Missing Chatwoot API credentials");
  }
  console.log("[listConversations] params:", params);
  const api = new ChatwootAPI({
    accountId: config.configurable.user.account_id,
    userAccessToken: config.configurable.user.access_token
  });
  const response = await api.listConversations(params);
  const data = [];
  const conversations = response.data.payload;
  console.log("[listConversations] conversations:", conversations.length);
  for (const conversation of conversations) {
    const messagesResponse = await api.getMessages(conversation.id);
    const messages = [];
    for (const message of messagesResponse.payload) {
      if (message.message_type === 2) {
        continue;
      }
      if (message.content && message.content.includes("Evolution Desconectado")) {
        continue;
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
          type: message.sender.type
        }
      });
    }
    data.push({
      id: conversation.id,
      contact: {
        id: messagesResponse.meta.contact.id,
        email: messagesResponse.meta.contact.email,
        name: messagesResponse.meta.contact.name,
        phone: messagesResponse.meta.contact.phone_number
      },
      messages,
      labels: conversation.labels,
      status: conversation.status,
      created_at: conversation.created_at,
      first_reply_created_at: conversation.first_reply_created_at,
      unread_count: conversation.unread_count,
      last_activity_at: conversation.last_activity_at,
      waiting_since: conversation.waiting_since
    });
  }
  const formattedMessages = {};
  for (const conversation of data) {
    formattedMessages[conversation.id] = [];
    const messages = conversation.messages;
    for (const message of messages) {
      formattedMessages[conversation.id].push(
        `${message.sender.name}: ${message.content}`
      );
    }
  }
  return new langgraph.Command({
    update: {
      data: {
        conversations: formattedMessages
      },
      messages: [
        new messages.ToolMessage({
          content: JSON.stringify(formattedMessages, null, 2),
          tool_call_id: config.toolCall.id
        })
      ]
    }
  });
}, {
  name: "list_conversations",
  description: "Obt\xE9m uma lista de conversas da conta. Cada requisi\xE7\xE3o cont\xE9m 25 conversas, que podem ser paginadas.",
  schema: zod.z.object({
    return_direct: zod.z.boolean().default(true).describe("Sempre ser\xE1 true"),
    include_messages: zod.z.boolean().describe('Incluir mensagens das conversas. Pode ser "true" ou "false".').default(true),
    assignee_type: zod.z.enum(["all", "unassigned", "assigned", "me"]).describe('Atribui\xE7\xE3o da conversa. Pode ser "all", "unassigned", "assigned" ou "me".').nullable(),
    status: zod.z.enum(["snoozed", "open", "resolved", "pending"]).describe('Status da conversa. Pode ser "snoozed", "open", "resolved" ou "pending".').nullable(),
    q: zod.z.string().describe("Termo textual a ser buscado nas conversas.").nullable(),
    labels: zod.z.array(zod.z.string()).describe("Filtros de etiquetas, opcionais.").nullable(),
    page: zod.z.number().default(1).nullable().describe("N\xFAmero da p\xE1gina a ser retornada."),
    sort_by: zod.z.enum(["last_activity_at_desc", "created_at_desc", "created_at_asc", "priority_desc", "priority_asc", "waiting_since_asc", "waiting_since_desc"]).nullable().default("last_activity_at_desc").describe("Ordena\xE7\xE3o das conversas.")
  })
});

const getSummaryReport = tools.tool(async ({ filters }, config) => {
  if (!config.configurable.user.account_id || !config.configurable.user.access_token) {
    throw new Error("Missing Chatwoot API credentials");
  }
  console.log("[getSummaryReport] filters:", filters);
  const api = new ChatwootAPI({
    accountId: config.configurable.user.account_id,
    userAccessToken: config.configurable.user.access_token
  });
  const data = await api.getSummaryReport(filters);
  console.log("[getSummaryReport] response:", data);
  return new langgraph.Command({
    update: {
      data: {
        summary: data
      },
      messages: [
        new messages.ToolMessage({
          content: JSON.stringify(data, null, 2),
          tool_call_id: config.toolCall.id
        })
      ]
    }
  });
}, {
  name: "get_summary_report",
  description: "Obt\xE9m um relat\xF3rio sumarizado da conta, que cont\xE9m informa\xE7\xF5es como quantidade de conversas, tempo m\xE9dio de resposta, tempo m\xE9dio de resolu\xE7\xE3o, quantidade de resolu\xE7\xF5es, tempo m\xE9dio de resposta anterior, entre outros.",
  schema: zod.z.object({
    return_direct: zod.z.boolean().default(true).describe("Sempre ser\xE1 true"),
    filters: zod.z.object({
      period: zod.z.enum(["today", "last_7_days", "last_month", "last_3_months", "last_6_months", "last_year"]).describe("Intervalo de tempo para filtrar os dados.")
    }).describe("Filtro de busca.")
  })
});

const endPoints = [
  "getSummaryReport",
  "listConversations",
  "getMessages"
];
const apiTools = [
  getMessages,
  listConversations,
  getSummaryReport
];
tools.tool(async ({
  currentStep,
  steps
}, config) => {
  console.log("[apiCallPlan] currentStep:", currentStep);
  console.log("[apiCallPlan] steps:", steps);
  return {
    currentStep,
    steps
  };
}, {
  name: "api_call_plan",
  description: "Cria o plano para execu\xE7\xE3o de uma chamada de API.",
  schema: zod.z.object({
    currentStep: zod.z.number().default(0).describe("Passo atual do plano de execu\xE7\xE3o."),
    steps: zod.z.array(zod.z.object({
      endpoint: zod.z.enum(endPoints).describe("Endpoint da chamada de API."),
      params: zod.z.object({}).nullable().describe("Par\xE2metros da chamada de API.")
    })).describe("Passos do plano de execu\xE7\xE3o.")
  })
});

const dataFetcherNode = async (state, config) => {
  log("DataFetcherAgent", "- init data fetcher node");
  console.log("DataFetcherAgent", "- user:", config?.configurable.user);
  const prompt = await hub.pull("xsales-data-fetcher");
  const toolNode = new prebuilt.ToolNode(apiTools);
  const shouldContinue = (state2) => {
    const { messages } = state2;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.tool_calls?.length) {
      return langgraph.END;
    } else {
      const args = lastMessage.tool_calls[0].args;
      if (args?.return_direct) {
        return "final";
      } else {
        return "tools";
      }
    }
  };
  const callModel = async (state2, config2) => {
    const response = await prompt.pipe(gpt4oMiniLlm.bindTools(apiTools)).invoke({
      apiEndpointsSpecs: JSON.stringify(apiEndpointsSpecs, null, 2),
      messages: state2.messages
    }, config2);
    return { messages: [response] };
  };
  const workflow = new langgraph.StateGraph(AgentState).addNode("agent", callModel).addNode("tools", toolNode).addNode("final", toolNode).addEdge(langgraph.START, "agent").addConditionalEdges("agent", shouldContinue).addEdge("tools", "agent").addEdge("final", langgraph.END);
  const app = workflow.compile();
  const supervisorMessage = new messages.SystemMessage({
    content: state.instructions,
    name: "Supervisor"
  });
  const result = await app.invoke(
    {
      messages: [
        supervisorMessage
      ]
    },
    {
      ...config,
      tags: ["xsales-data-fetcher"]
    }
    // metadata: {
    //   accountId: 3,
    //   accessToken: 'JzVYik7yyBq696fGA9UjAM4q'
    // }
  );
  await dispatch.dispatchCustomEvent("data_source_added", result.data);
  return {
    data: result.data,
    messages: [
      new messages.AIMessage({
        content: supervisorMessage.content,
        name: "Supervisor"
      }),
      new messages.AIMessage({
        content: `${JSON.stringify(result.data, null, 2)}`,
        name: "DataFetcherAgent"
      })
    ]
  };
};

const analysisNode = async (state, config) => {
  log("analysisNode", "- init analyzer node");
  const prompt = await hub.pull("xsales-conversation-analyzer");
  const chain = prompt.pipe(
    gpt4oMiniLlm
    // .bind({
    //   response_format: {
    //     type: 'json_object',
    //   }
    // })
  ).pipe(new output_parsers.StringOutputParser());
  const supervisorMessage = new messages.SystemMessage({
    content: state.instructions,
    name: "Supervisor"
  });
  const lastDataFetcherMessage = state.messages.find((m) => m.name === "DataFetcherAgent");
  const response = await chain.invoke({
    // example: formatterExample,
    messages: [
      lastDataFetcherMessage,
      supervisorMessage
    ]
  }, config);
  return {
    messages: [
      new messages.AIMessage({
        content: supervisorMessage.content,
        name: "Supervisor"
      }),
      new messages.AIMessage({
        content: response,
        name: "AnalysisAndInsightAgent"
      })
    ]
  };
};

const mainGraph = async (plot = false) => {
  const workflow = new langgraph.StateGraph(AgentState).addNode("supervisor", supervisorNode).addNode("DataFetcherAgent", dataFetcherNode).addNode("AnalysisAndInsightAgent", analysisNode).addNode("CommunicationAgent", communicationNode).addEdge(langgraph.START, "supervisor").addEdge("CommunicationAgent", langgraph.END);
  members.filter((m) => m != "CommunicationAgent").forEach((member) => {
    workflow.addEdge(member, "supervisor");
  });
  workflow.addConditionalEdges(
    "supervisor",
    (x) => x.next
  );
  const graph = workflow.compile();
  if (plot) {
    const drawableGraph = await graph.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    const fs = require$1("fs");
    fs.writeFileSync(__dirname + "/main.png", Buffer.from(arrayBuffer));
  }
  return graph;
};

const mainPipeline = async ({
  chatId,
  message,
  onNewMessage,
  onEndMessage,
  onNewToken,
  user,
  stream
}) => {
  const graph = await mainGraph();
  const api = new XSalesAPI();
  const chatMessages = await api.getMessages(chatId);
  console.log("messages get", chatMessages);
  console.log(" - user:", user);
  const messages$1 = chatMessages.map((message2) => {
    switch (message2.role) {
      case "user":
        return new messages.HumanMessage({
          content: message2.content,
          name: "User"
        });
      case "assistant":
        return new messages.AIMessage({
          content: message2.content,
          name: "CommunicationAgent"
        });
    }
  });
  if (stream) {
    let eventStream = graph.streamEvents(
      {
        messages: [
          ...messages$1,
          new messages.HumanMessage({
            content: message,
            name: "User"
          })
        ]
      },
      {
        tags: ["xsales-main"],
        configurable: {
          user
        },
        version: "v2"
      }
    );
    let dataSource = {};
    for await (const { event, tags, data, run_id, name } of eventStream) {
      if (event == "on_chat_model_start" && tags?.includes("xsales-communication")) {
        console.log("Model started");
        onNewMessage({
          id: run_id
        });
      }
      if (event === "on_chat_model_stream" && tags?.includes("xsales-communication")) {
        if (data.chunk.content) {
          onNewToken({
            messageId: run_id,
            content: data.chunk.content
          });
        }
      }
      if (event === "on_chat_model_end" && tags?.includes("xsales-communication")) {
        console.log("Model ended [update]");
        console.log("saving assistant message:", data.output.content);
        console.log("dataSource:", dataSource);
        await api.saveMessages(chatId, [
          {
            content: message,
            chatId,
            role: "user"
          },
          {
            content: data.output.content,
            chatId,
            metadata: dataSource,
            role: "assistant"
          }
        ]);
        dataSource = {};
        onEndMessage({
          id: run_id
        });
      }
      if (event === "on_custom_event" && name === "data_source_added") {
        console.log("DATA SOURCE ADDED");
        Object.keys(data).forEach((key) => {
          dataSource[key] = data[key];
        });
      }
    }
  }
};

const fs = require$1("fs");
const app = fastify({
  https: {
    key: fs.readFileSync("/home/vitor/certs/privkey.pem"),
    cert: fs.readFileSync("/home/vitor/certs/fullchain.pem")
  },
  logger: true
});
app.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:3000"
});
app.register(fastifyIO, {});
app.register(router);
app.ready().then(() => {
  app.io.of("/main").on("connection", (socket) => {
    console.log("a user connected to main");
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
    socket.on("message", async (data) => {
      console.log("message: ", data);
      await mainPipeline({
        chatId: data.chatId,
        message: data.message,
        stream: true,
        user: data.user,
        onNewMessage: (data2) => {
          try {
            socket.emit("newMessage", {
              id: data2.id
            });
          } catch (error) {
            console.log("error emiting", error);
          }
        },
        onNewToken: (data2) => {
          socket.emit("token", {
            message_id: data2.messageId,
            content: data2.content
          });
        },
        onEndMessage: (data2) => {
          socket.emit("endMessage", {
            id: data2.id
          });
        }
      });
    });
  });
  app.io.of("/conversation").on("connection", (socket) => {
    console.log("a user connected to conversation");
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
    socket.on("message", (msg) => {
      console.log("message: " + msg);
    });
  });
});
app.listen({ port: 3001, host: "0.0.0.0" }, async function(err, address) {
  if (err) {
    app.log.error(err);
    await promises.awaitAllCallbacks();
    process.exit(1);
  }
  process.on("SIGINT", async () => {
    console.log("Received SIGINT");
    await promises.awaitAllCallbacks().then(() => {
      console.log("Exiting after callbacks");
      process.exit(0);
    });
  });
  process.on("SIGTERM", async () => {
    console.log("Received SIGTERM");
    await promises.awaitAllCallbacks().then(() => {
      console.log("Exiting after callbacks");
      process.exit(0);
    });
  });
});
