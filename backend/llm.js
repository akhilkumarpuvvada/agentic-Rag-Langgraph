import { ChatOpenAI } from "@langchain/openai";
import { OPENAI_API_KEY } from "./config.js";

export function initLLM() {
  return new ChatOpenAI({
    model: "gpt-4.1",
    apiKey: OPENAI_API_KEY,
  });
}
