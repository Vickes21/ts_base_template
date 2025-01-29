import { HumanMessage } from "@langchain/core/messages";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableConfig } from "@langchain/core/runnables";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { pull } from "langchain/hub";
import { ExampleState } from "src/graphs/example/example.state";
import { exampleTool } from "src/graphs/example/tools/example.tool";
import { gpt4oMiniLlm } from "src/lib/models";

export const exampleNode = async (
  state: typeof ExampleState.State,
  config?: RunnableConfig
) => {

  const prompt = await pull<ChatPromptTemplate>("example-prompt");

  const agent = createReactAgent({
    llm: gpt4oMiniLlm,
    tools: [
      exampleTool
    ],
    stateSchema: ExampleState,
    stateModifier: await prompt.partial({})
  })

  const humanMessage = new HumanMessage({
    content: `Exemplo: ${state.example}`
  })

  const result = await agent.invoke({
    messages: [
      humanMessage
    ]
  }, config)

  const lastMessage = result.messages[result.messages.length - 1]

  return {
    //É possivel atualizar o estado do node
    example: `Novo valor a ser atualizado: ${result.example}`,
    //merge de mensagens
    messages: [
      lastMessage
    ]
  }
}