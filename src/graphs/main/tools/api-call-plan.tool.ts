import { tool } from "@langchain/core/tools";
import { getMessages } from "src/graphs/main/tools/xsales_api/get_messages";
import { listConversations } from "src/graphs/main/tools/xsales_api/list_conversations";
import { getSummaryReport } from "src/graphs/main/tools/xsales_api/report_summary";
import { z } from "zod";

export const endPoints = [
  'getSummaryReport',
  'listConversations',
  'getMessages',
] as const;

export const apiTools = [
  getMessages,
  listConversations,
  getSummaryReport
]
export const apiCallPlan = tool(async ({
  currentStep, steps
}, config) => {

  console.log('[apiCallPlan] currentStep:', currentStep);
  console.log('[apiCallPlan] steps:', steps);

  //get tool based on endpoint
  // const tool = apiTools.find(tool => tool.name === steps[currentStep].endpoint);
  // if (!tool) {
  //   throw new Error(`Tool ${steps[currentStep].endpoint} not found`);
  // }

  // //call tool
  // const response = await tool.invoke(steps[currentStep].params, config);
  //return the plan
  return {
    currentStep,
    steps,
  }
}, {
  name: 'api_call_plan',
  description: 'Cria o plano para execução de uma chamada de API.',
  schema: z.object({
    currentStep: z.number().default(0).describe('Passo atual do plano de execução.'),
    steps: z.array(z.object({
      endpoint: z.enum(endPoints).describe('Endpoint da chamada de API.'),
      params: z.object({}).nullable().describe('Parâmetros da chamada de API.'),
    })).describe('Passos do plano de execução.'),
  })
})