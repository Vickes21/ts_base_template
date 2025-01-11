import { RunnableConfig } from "@langchain/core/runnables";
import { AgentState, apiEndpointsSpecs, log } from "../shared/utils";
import { pull } from "langchain/hub";
import { ChatPromptTemplate, PromptTemplate, SystemMessagePromptTemplate } from "@langchain/core/prompts";
import { gpt4oLlm, gpt4oMiniLlm } from "../shared/models";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import { getMessages } from "src/graphs/main/tools/xsales_api/get_messages";
import { listConversations } from "src/graphs/main/tools/xsales_api/list_conversations";
import { getSummaryReport } from "src/graphs/main/tools/xsales_api/report_summary";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { apiCallPlan, apiTools } from "src/graphs/main/tools/api-call-plan.tool";
import { END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";

export const dataFetcherNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig
) => {

  log("DataFetcherAgent", "- init data fetcher node");
  console.log("DataFetcherAgent", "- user:", config?.configurable!.user);



  const prompt = await pull<ChatPromptTemplate>("xsales-data-fetcher");

  const toolNode = new ToolNode(apiTools)

  const shouldContinue = (state: typeof MessagesAnnotation.State) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;

    // If there is no function call, then we finish
    if (!lastMessage?.tool_calls?.length) {
      return END;
    } // Otherwise if there is, we check if it's suppose to return direct
    else {
      const args = lastMessage.tool_calls[0].args;
      if (args?.return_direct) {
        return "final";
      } else {
        return "tools";
      }
    }
  }

  const callModel = async (state: typeof MessagesAnnotation.State, config?: RunnableConfig) => {
    const response = await prompt.pipe(gpt4oMiniLlm.bindTools(apiTools)).invoke({
      apiEndpointsSpecs: JSON.stringify(apiEndpointsSpecs, null, 2),
      messages: state.messages,
    }, config);
    return { messages: [response] };
  }

  const workflow = new StateGraph(AgentState)
    // Define the two nodes we will cycle between
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addNode("final", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent")
    .addEdge("final", END);

  const app = workflow.compile()


  // const dataFetcherAgent = createReactAgent({
  //   llm: gpt4oMiniLlm,
  //   tools: apiTools,
  //   stateSchema: AgentState,
  //   stateModifier: await prompt.partial({
  //     apiEndpointsSpecs: JSON.stringify(apiEndpointsSpecs, null, 2)
  //   })
  // })

  const supervisorMessage = new SystemMessage({
    content: state.instructions,
    name: 'Supervisor'
  })


  const result = await app.invoke({
    messages: [
      supervisorMessage,
    ],
  }, {
    ...config,
    tags: ['xsales-data-fetcher'],
  }
    // metadata: {
    //   accountId: 3,
    //   accessToken: 'JzVYik7yyBq696fGA9UjAM4q'
    // }
  );
  // const lastMessage = result.messages[result.messages.length - 1];

  // console.log('[dataFetcherNode] DATA:', result.data);
  
  await dispatchCustomEvent("data_source_added", result.data);

  return {
    data: result.data,
    messages: [
      new AIMessage({
        content: supervisorMessage.content, name: 'Supervisor'
      }),
      new AIMessage({
        content: `${JSON.stringify(result.data, null, 2)}`, name: 'DataFetcherAgent'
      }),
    ],
  };
}