import { initLLM } from "./llm.js";
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";

const llm = initLLM();

const schema = z.object({
  pass: z
    .boolean()
    .describe(
      "true if the answer is relevant, complete, and clear; false otherwise"
    ),
  reason: z
    .string()
    .describe("short explanation of why the answer passed or failed"),
});

// Create parser
const parser = StructuredOutputParser.fromZodSchema(schema);

export const gradeAnswer = async (answer, question, context) => {

  const formatInstructions = parser.getFormatInstructions();

  const messages = [
    { role: "system", content: "You are a strict evaluator of answers." },
    {
      role: "user",
      content: `Question: ${question}\nContext: ${context}\nAnswer: ${answer}\n\nEvaluate this answer.\n\n${formatInstructions}`,
    },
  ];

  const raw = await llm.invoke(messages);

  const parsed = await parser.parse(raw.content);

  return parsed;
};
