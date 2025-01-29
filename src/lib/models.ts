import { ChatOpenAI } from "@langchain/openai";

export const gpt4oMiniLlm = new ChatOpenAI({
  modelName: "gpt-4o-mini",
  temperature: 0,
});

export const gpt4oLlm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0,
});