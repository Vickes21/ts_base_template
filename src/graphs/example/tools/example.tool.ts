import { ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { z } from "zod";

export const exampleTool = tool(async ({ example }, config) => {
  //do something with example

  return new Command({
    update: {
      example: 'novo valor a ser atualizado',
      messages: [
        new ToolMessage({
          content: `Exemplo: ${example}`,
          tool_call_id: config.toolCall.id,
        }),
      ],
    },
  })
}, {
  name: "ExampleTool",
  description: "Exemplo de descrição",
  schema: z.object({
    example: z.string().optional(),
  })
})