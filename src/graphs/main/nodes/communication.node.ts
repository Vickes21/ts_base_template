import { RunnableConfig } from "@langchain/core/runnables";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentState, log } from "src/graphs/main/shared/utils";
import { gpt4oMiniLlm } from "src/graphs/main/shared/models";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export const communicationNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig
) => {

  log("CommunicationAgent", "- init communication node");

  const prompt = await pull<ChatPromptTemplate>("xsales-communication");

  const chain = prompt
    .pipe(gpt4oMiniLlm)


  //remove all messages that are not from "User" or "CommunicationAgent", but preserve the order
  // const filteredMessages = state.messages.filter((message) => {
  //   return message.name === 'User' || message.name === 'CommunicationAgent'
  // })

  // //mantem a última mensagem se ela não for do CommunicationAgent ou User, provavlemente é do data fetcher ou analytics
  // const lastMessage = state.messages[state.messages.length - 1]
  // if (lastMessage && lastMessage.name != 'CommunicationAgent' && lastMessage.name != 'User') {
  //   filteredMessages.push(lastMessage)
  // }

  const response = await chain.invoke({
    user_name: config?.configurable?.user.name,
    user_email: config?.configurable?.user.email,
    messages: [
      ...state.messages,
      new SystemMessage({
        content: state.instructions,
        name: 'Supervisor'
      })
    ]
  }, {
    tags: ['xsales-communication']
  })

  console.log('[FINAL RESPONSE]', response.content);


  return {
    messages: [
      response
    ]
  };
}