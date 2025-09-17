import { initLLM } from "./llm.js";
  const llm = initLLM();

export const queryExpander = async (query) => {
  const messages = [
    { role: "system", content: "You are query writer for search engines" },
    {
      role: "user",
      content: `Rewrite the following question into 3 different phrasings that might match documents better. Keep them short.\n\nQuestion: "${query}"`,
    },
  ];
  const res = await llm.invoke(messages);

  const rewrites = res.content
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return [query, ...rewrites];
};
