import { HumanMessage } from "@langchain/core/messages";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableConfig } from "@langchain/core/runnables";
import { MessagesAnnotation } from "@langchain/langgraph";
import { createAgentExecutor, createReactAgent } from "@langchain/langgraph/prebuilt";
import { pull } from "langchain/hub";
import { ChatTitleState } from "src/graphs/chat-title/chat-title.state";
import { setChatTitleTool } from "src/graphs/chat-title/tools/set-chat-title.tool";
import { gpt4oMiniLlm } from "src/graphs/main/shared/models";

export const nameChatNode = async (
  state: typeof ChatTitleState.State,
  config?: RunnableConfig
) => {
  console.log("nameChatNode", "- init name chat node");

  const prompt = await pull<ChatPromptTemplate>("xsales-chat-title");

  const agent = createReactAgent({
    llm: gpt4oMiniLlm,
    tools: [
      setChatTitleTool
    ],
    stateSchema: ChatTitleState,
    stateModifier: await prompt.partial({})
  })

  const humanMessage = new HumanMessage({
    content: `Conversas do Chat: ${state.chatHistory}`
  })

  const result = await agent.invoke({
    messages: [
      humanMessage
    ]
  }, config)

  const lastMessage = result.messages[result.messages.length - 1]

  return {
    chatTitle: result.chatTitle,
    messages: [
      lastMessage
    ]
  }
}