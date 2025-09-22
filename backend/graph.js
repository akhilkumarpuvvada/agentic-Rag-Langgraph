// graph.js
import { StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { checkTruthFullness } from "./guardrails/guardrails.js";
import { checkToxicity } from "./guardrails/filters.js";
import { gradeAnswer } from "./guardrails/grading.js";
import { webSearch } from "./webSearch.js"; // ✅ Tavily integration

// 1. State schema
const GraphState = z.object({
  question: z.string(),
  context: z.string().optional(),
  outputs: z.array(z.object({
    agent: z.string(),
    content: z.string(),
  })).default([]),
  output: z.string().optional(),
  plan: z.array(z.string()).optional(),
  stepIndex: z.number().default(0),
  next: z.string().optional(),
  forceWebsearch: z.boolean().optional(),
});

// ---------------- Nodes ----------------

// 2. Retriever node
async function retrieverNode(state, { retriever, llm }) {
  console.log("🔎 RetrieverNode running...");
  const result = await retriever.invoke(state.question);

  if (!result.context || result.context.trim().length < 20) {
    console.log("⚠️ Empty context → websearch");
    return { forceWebsearch: true };
  }

  // ✅ LLM relevance check
  const relevanceCheck = await llm.invoke([
    { role: "system", content: "You are a strict relevance checker." },
    {
      role: "user",
      content: `Question: ${state.question}\n\nContext: ${result.context}\n\nIs the context relevant to answering the question? Reply only 'yes' or 'no'.`,
    },
  ]);

  if (!relevanceCheck.content.toLowerCase().includes("yes")) {
    console.log("⚠️ Context not relevant → websearch");
    return { forceWebsearch: true };
  }

  return {
    context: result.context,
    outputs: [...(state.outputs || []), { agent: "retriever", content: result.context }],
  };
}

// 3. Answer node
async function answerNode(state, { llm }) {
  console.log("💡 AnswerNode running...");
  const outputs = state.outputs || [];
  const summaryOutput = outputs.find(o => o.agent === "summary")?.content;

  const effectiveContext = summaryOutput
    ? `Summary:\n${summaryOutput}`
    : state.context || "No context found.";

  const messages = [
    { role: "system", content: "You are a helpful evaluator assistant." },
    {
      role: "user",
      content: `Context:\n${effectiveContext}\n\nQ: ${state.question}`,
    },
  ];

  const res = await llm.invoke(messages);

  // --- Guardrails ---
  const guard = await checkTruthFullness(res.content, state.context || "");
  if (!guard.isFaithful) return { next: "fallback" };

  const checkSafety = await checkToxicity(res.content);
  if (!checkSafety.safe) return { next: "fallback" };

  const grade = await gradeAnswer(res.content, state.question, state.context || "");
  if (!grade.pass) {
    console.log(`⚠️ Grading failed → ${grade.reason}`);
    return { next: "fallback" };
  }

  return {
    outputs: [...outputs, { agent: "answer", content: res.content }],
  };
}

// 4. Summary node
async function summaryNode(state, { llm }) {
  console.log("📝 SummaryNode running...");
  const res = await llm.invoke([
    { role: "system", content: "You are a concise summarizer." },
    { role: "user", content: `Summarize in 1–2 sentences:\n\n${state.context}` },
  ]);

  return {
    outputs: [...(state.outputs || []), { agent: "summary", content: res.content }],
  };
}

// 5. Compare node
async function compareNode(state, { llm }) {
  console.log("⚖️ CompareNode running...");
  const res = await llm.invoke([
    { role: "system", content: "You compare concepts clearly." },
    { role: "user", content: `Compare based on context:\n\n${state.context}\n\nQ: ${state.question}` },
  ]);

  return {
    outputs: [...(state.outputs || []), { agent: "compare", content: res.content }],
  };
}

// 6. WebSearch node
async function webSearchNode(state) {
  console.log("🌍 WebSearchNode running...");
  const result = await webSearch(state.question);

  if (!result) {
    console.log("⚠️ WebSearch returned nothing → fallback");
    return { next: "fallback" };
  }

  return {
    context: result,
    outputs: [...(state.outputs || []), { agent: "websearch", content: result }],
  };
}

// 7. Fallback node
async function fallbackNode(state) {
  console.log("❓ FallbackNode running...");
  const msg = `❌ Sorry, I can only answer if the question is relevant to data in the PDF or the web. Your question: "${state.question}" is unsupported.`;
  return {
    outputs: [...(state.outputs || []), { agent: "fallback", content: msg }],
  };
}

// 8. Planner node
async function plannerNode(state, { llm }) {
  console.log("🧭 PlannerAgent running...");

  const messages = [
    { role: "system", content: `You are a planner agent. 
    Break the user's request into a sequence of steps.
    Available agents: retriever, answer, summary, compare, websearch, fallback.
    Always return a JSON array, e.g.: ["retriever","answer"].` },
    { role: "user", content: `User asked: "${state.question}"` },
  ];

  const res = await llm.invoke(messages);

  try {
    const plan = JSON.parse(res.content);
    console.log("📝 Plan:", plan);
    return { plan, stepIndex: 0, next: plan[0] };
  } catch (e) {
    console.error("❌ Planner failed → fallback");
    return { plan: ["fallback"], stepIndex: 0, next: "fallback" };
  }
}

// 9. Step Executor node
async function stepExecutorNode(state) {
  const { plan, stepIndex, forceWebsearch } = state;

  // ✅ If retriever said "irrelevant → websearch", jump there
  if (forceWebsearch) {
    return { next: "websearch", stepIndex }; 
  }

  if (!plan || stepIndex >= plan.length) {
    return { next: "combiner" };
  }

  const nextStep = plan[stepIndex];
  console.log(`➡️ Executing step ${stepIndex + 1}/${plan.length}: ${nextStep}`);

  return { next: nextStep, stepIndex: stepIndex + 1 };
}

// 10. Combiner node
async function combinerNode(state, { llm }) {
  console.log("🔗 CombinerNode running...");
  const steps = state.outputs || [];

  if (steps.length === 0) {
    return {
      output: "❌ No useful results were generated for your question.",
      outputs: [{ agent: "final", content: "No useful results." }],
    };
  }

  const allSteps = steps.map(o => `${o.agent.toUpperCase()}:\n${o.content}`).join("\n\n");

const messages = [
  { role: "system", content: "You are a precise report generator." },
  {
    role: "user",
    content: `The following are intermediate results from different agents:\n\n${allSteps}\n\n
User's question: "${state.question}"

👉 Instructions:
- Only include the sections that are directly relevant to the user's question.
- If the user asks for a "summary", include only a concise summary.
- If the user asks for a "comparison" (compare, contrast, vs), include only a comparison.
- If the user asks for a "rating" (score, evaluate out of 10), include only the rating number with 1–2 lines justification.
- If the user asks for multiple things (e.g., summary + comparison + rating), include exactly those sections.
- If the user asks a direct factual question (not summary/compare/rating), provide a single direct answer.
- Do NOT include irrelevant sections.
- Do NOT add extra labels or boilerplate.
- Keep the output clear, professional, and user-friendly.`,
  },
];

  const res = await llm.invoke(messages);

  return { output: res.content, outputs: [...steps, { agent: "final", content: res.content }] };
}

// ---------------- Build Graph ----------------
export function buildGraph(retriever, llm) {
  const graph = new StateGraph(GraphState)
    .addNode("planner", (s) => plannerNode(s, { llm }))
    .addNode("stepExecutor", stepExecutorNode)
    .addNode("retriever", (s) => retrieverNode(s, { retriever, llm }))
    .addNode("answer", (s) => answerNode(s, { llm }))
    .addNode("summary", (s) => summaryNode(s, { llm }))
    .addNode("compare", (s) => compareNode(s, { llm }))
    .addNode("websearch", webSearchNode)
    .addNode("fallback", fallbackNode)
    .addNode("combiner", (s) => combinerNode(s, { llm }))

    .addEdge("__start__", "planner")
    .addEdge("planner", "stepExecutor")

    .addConditionalEdges("stepExecutor", (s) => s.next, {
      retriever: "retriever",
      answer: "answer",
      summary: "summary",
      compare: "compare",
      websearch: "websearch",
      fallback: "fallback",
      combiner: "combiner",
    })

    .addEdge("retriever", "stepExecutor")
    .addEdge("answer", "stepExecutor")
    .addEdge("summary", "stepExecutor")
    .addEdge("compare", "stepExecutor")
    .addEdge("websearch", "stepExecutor")
    .addEdge("fallback", "combiner")
    .addEdge("combiner", "__end__");

  return graph.compile();
}
