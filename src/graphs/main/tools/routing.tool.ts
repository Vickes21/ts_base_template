import { END } from "@langchain/langgraph";
import { z } from "zod";
import { members } from "../shared/utils";

// Define the routing function
export const routingTool = {
  name: "route",
  description: "Seleciona o pŕoximo agente, passando instruções específicas a ele sobre o que fazer.",
  schema: z.object({
    // goal: z.string().describe('Objetivo do usuário para esta conversa.'),
    instructions: z.string().describe('Instruções a serem seguidas pelo próximo agente, quanto mais detalhadas melhor.'),
    next: z.enum([...members]),
  }),
}