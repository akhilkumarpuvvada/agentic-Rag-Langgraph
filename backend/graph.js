// graph.js
import { StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { checkTruthFullness } from "./guardrails.js";

// 1. State schema
const GraphState = z.object({
  question: z.string(),
  context: z.string().optional(),
  next: z.string().optional(),
  output: z.string().optional(),
});

// 2. Retriever node
async function retrieverNode(state, { retriever }) {
  console.log("🔎 RetrieverNode running...");
  const docs = await retriever.invoke(state.question);
  const context = docs.map(d => d.pageContent).join("\n\n");
  return { context };
}

// 3. Answer node
async function answerNode(state, { llm }) {
  console.log("💡 AnswerNode running...");
  const messages = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: `Context:\n${state.context}\n\nQ: ${state.question}` },
  ];
  const res = await llm.invoke(messages);

  const guard = await checkTruthFullness(res.content, state.context);
  if(!guard.isFaithful) {
    return { next: "fallback" } 
  }
  return { output: res.content };
}

// 4. Summary node
async function summaryNode(state, { llm }) {
  console.log("📝 SummaryNode running...");
  const messages = [
    { role: "system", content: "You are a concise summarizer." },
    { role: "user", content: `Summarize in 1–2 sentences:\n\n${state.context}` },
  ];
  const res = await llm.invoke(messages);
  return { output: res.content };
}

// 5. Compare node
async function compareNode(state, { llm }) {
  console.log("⚖️ CompareNode running...");
  const messages = [
    { role: "system", content: "You compare concepts clearly." },
    { role: "user", content: `Compare based on context:\n\n${state.context}\n\nQ: ${state.question}` },
  ];
  const res = await llm.invoke(messages);
  return { output: res.content };
}

// 6. Fallback node
async function fallbackNode(state, { llm }) {
  console.log("❓ FallbackNode running...");
  return { output: `❌ Sorry, I can only answer, if the question is relevant to data in the PDF. Your question: "${state.question}" is unsupported.` };
}

// 7. LLM Router node
async function llmRouterNode(state, { llm }) {
  console.log("🚦 LLMRouterNode running...");

const messages = [
  {
    role: "system",
    content: `You are a strict mode router.
Your job is to map the user request into exactly one of: answer, summary, compare, or fallback.

Rules:
- "summary" → includes TL;DR, synopsis, gist, overview, recap, abstract, outline, digest, brief, or any synonym/misspelling of "summary".
- "compare" → includes compare, vs, difference, contrast, pros and cons, similarities, differences, or any synonym/misspelling of "compare".
- "answer" → includes factual Q&A, explanations, ratings, evaluations, how/why questions, or any synonym/misspelling of "answer".
   IMPORTANT: Only choose "answer" if the retrieved context below contains relevant information to the question.
- If none of these clearly apply OR the context does not contain relevant info → return "fallback".

Important:
- Always normalize typos (e.g., "summry" → "summary").
- Always consider both the QUESTION and the CONTEXT.
- Always return only one of: answer, summary, compare, fallback.
- Do NOT add punctuation, explanations, or extra words.`,
  },
  { role: "user", content: `User asked: "${state.question}"\n\nContext:\n${state.context}` },
];

  const res = await llm.invoke(messages);
  const normalized = res.content.trim().toLowerCase();

  console.log(`🔀 Router mapped → "${normalized}"`);

  if (!["answer", "summary", "compare", "fallback"].includes(normalized)) {
    return { next: "fallback" };
  }
  return { next: normalized };
}

// 8. Build Graph
export function buildGraph(retriever, llm) {
  const graph = new StateGraph(GraphState)
    .addNode("retrieverNode", (s) => retrieverNode(s, { retriever }))
    .addNode("routerNode", (s) => llmRouterNode(s, { llm }))
    .addNode("answer", (s) => answerNode(s, { llm }))
    .addNode("summary", (s) => summaryNode(s, { llm }))
    .addNode("compare", (s) => compareNode(s, { llm }))
    .addNode("fallback", (s) => fallbackNode(s, { llm }))

    .addEdge("__start__", "retrieverNode")
    .addEdge("retrieverNode", "routerNode")

    .addConditionalEdges("routerNode", (s) => s.next, {
      answer: "answer",
      summary: "summary",
      compare: "compare",
      fallback: "fallback",
    })

    .addEdge("answer", "__end__")
    .addEdge("summary", "__end__")
    .addEdge("compare", "__end__")
    .addEdge("fallback", "__end__");

  return graph.compile();
}
