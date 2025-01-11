import { JsonOutputParser, StringOutputParser } from "@langchain/core/output_parsers";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableConfig } from "@langchain/core/runnables";
import { pull } from "langchain/hub";
import { gpt4oMiniLlm } from "src/graphs/main/shared/models";
import { AgentState, log } from "src/graphs/main/shared/utils";

export const analysisNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig
) => {

  log("analysisNode", "- init analyzer node");

  const prompt = await pull<ChatPromptTemplate>("xsales-conversation-analyzer");

  const formatterExample = `
  {
    "patterns": {
      "successful_sequences": string[],
      "best_arguments": string[],
      "conversion_times": string[],
    },
    "issues": {
      "dropout_points": string[],
      "repeated_questions": string[],
      "slow_responses": string[],
    },
    "client_behavior": {
      "common_objections": string[],
      "frequent_questions": string[],
      "buying_triggers": string[],
    },
    "performance_metrics": {
      "argument_success_rates": { [key: string]: number },
      "response_times": { [key: string]: number },
      "script_adherence": { [key: string]: number },
    }
  }
  `

  const chain = prompt.pipe(
    gpt4oMiniLlm
    // .bind({
    //   response_format: {
    //     type: 'json_object',
    //   }
    // })
  )
    .pipe(new StringOutputParser())
  // .pipe(new JsonOutputParser<
  //   {
  //     "patterns": {
  //       "successful_sequences": string[],
  //       "best_arguments": string[],
  //       "conversion_times": string[],
  //     },
  //     "issues": {
  //       "dropout_points": string[],
  //       "repeated_questions": string[],
  //       "slow_responses": string[],
  //     },
  //     "client_behavior": {
  //       "common_objections": string[],
  //       "frequent_questions": string[],
  //       "buying_triggers": string[],
  //     },
  //     "performance_metrics": {
  //       "argument_success_rates": { [key: string]: number },
  //       "response_times": { [key: string]: number },
  //       "script_adherence": { [key: string]: number },
  //     }
  //   }>())
  const supervisorMessage = new SystemMessage({
    content: state.instructions,
    name: 'Supervisor'
  })
  const lastDataFetcherMessage = state.messages.find((m) => m.name === "DataFetcherAgent")
  const response = await chain.invoke({
    // example: formatterExample,
    messages: [
      lastDataFetcherMessage,
      supervisorMessage
    ],
  }, config)



  return {
    messages: [
      new AIMessage({
        content: supervisorMessage.content, name: 'Supervisor'
      }),
      new AIMessage({
        content: response, name: "AnalysisAndInsightAgent"
      })
    ]
  }
}