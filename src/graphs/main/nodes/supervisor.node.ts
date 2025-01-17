import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { routingTool } from "../tools/routing.tool";
import { pull } from "langchain/hub";
import { gpt4oLlm, gpt4oMiniLlm } from "../shared/models";
import { AgentState, apiEndpointsSpecs, log } from "src/graphs/main/shared/utils";
import { RunnableConfig } from "@langchain/core/runnables";
import { IUser } from "src/types/user";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";


export const supervisorNode = async (
  state: typeof AgentState.State,
  config: RunnableConfig
) => {
  log("supervisor", "- init supervisor node");

  const prompt = await pull<ChatPromptTemplate>("xsales-supervisor");

  // await dispatchCustomEvent("data_source_added", {
  //   xpto: 'xpto'
  // });

  const chain = (
    await prompt.partial({
      user_name: config.configurable!.user.name,
      user_email: config.configurable!.user.email,
      apiEndpointsSpecs: JSON.stringify(apiEndpointsSpecs, null, 2),
    })
  ).pipe(gpt4oMiniLlm.bindTools(
    [routingTool],
    {
      tool_choice: "route",
    },
  ))
    // select the first one
    //in this case we aways have only one tool call
    .pipe((x) => (x.tool_calls![0].args));

  return chain

  // const functionalAgentMessages = state.messages.filter((message) => {
  //   return message.name === 'DataFetcherAgent' ||
  //     message.name === 'AnalysisAndInsightAgent'
  // })

  // const communicationMessages = state.messages.filter((message) => {
  //   return message.name === 'CommunicationAgent' ||
  //     message.name === 'User'
  // })

  // const lastFunctionalAgentMessage = functionalAgentMessages[functionalAgentMessages.length - 1]

  // if (lastFunctionalAgentMessage) {
  //    //only the last message from the functional agents
  //   communicationMessages.push(lastFunctionalAgentMessage)
  // }

  // const response = await chain.invoke({
  //   messages: [
  //     ...communicationMessages,     
  //   ]
  // })

  // console.log('[SUPERVISOR RESPONSE]', response);

  // return {
  //   next: response.next,
  //   instructions: response.instructions,
  // }
}