import { initLLM } from "../llm.js";

const llm = initLLM();

/**
 * Check if an answer contains abusive/toxic content.
 * Returns { safe: boolean, reason: string }
 */
export const checkToxicity = async (answer) => {
  const messages = [
    { role: "system", content: "You are a strict safety filter." },
    {
      role: "user",
      content: `Check the following text for abusive, toxic, hateful, violent, or unsafe language. 
If it is clean, reply ONLY with "safe". If it is unsafe, reply ONLY with "unsafe". 
Text:\n${answer}`,
    },
  ];

  const res = await llm.invoke(messages);
  const reply = res.content.toLowerCase();

  return {
    safe: reply.includes("safe"),
  };
};
