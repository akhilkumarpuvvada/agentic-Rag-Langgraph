import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import { OpenAIEmbeddings } from "@langchain/openai";
import { loadAndSplitPDF } from "./pdfLoader.js";
import { initVectorStore } from "./db.js";
import { initBM25 } from "./bm25.js";
import { hybridRetriever } from "./hybridRetriever.js";
import { initLLM } from "./llm.js";
import { buildGraph } from "./graph.js";
import { OPENAI_API_KEY } from "./config.js";

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.json());

// ---- GLOBALS (for demo, later move to DB/Redis) ----
let retriever;
let graphApp;

// ---- Init pipeline ----
async function initPipeline() {
  // 1. Load embeddings
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: OPENAI_API_KEY,
  });

  // 2. Load PDFs
  const pdfPaths = ["./sample.pdf", "./sample1.pdf"];
  let allDocs = [];
  for (const path of pdfPaths) {
    const docs = await loadAndSplitPDF(path);
    allDocs = allDocs.concat(docs);
  }
  console.log(`✅ Loaded ${allDocs.length} chunks from PDFs`);

  // 3. Init VectorStore
  const vectorStore = await initVectorStore(allDocs, embeddings);
  

  // 4. Init BM25
  const { bm25Engine, bm25Docs } = initBM25(allDocs);

  // 5. Hybrid retriever
  retriever = {
    invoke: (q) => hybridRetriever(q, { vectorStore, bm25Engine, bm25Docs }),
  };

  // 6. Init LLM
  const llm = initLLM();

  // 7. Build graph
  graphApp = buildGraph(retriever, llm);

  console.log("🧠 Pipeline ready!");
}

// ---- API Endpoints ----
app.post("/ingest", async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: "Missing PDF path" });

    console.log(`📥 Ingesting new PDF: ${path}`);
    const docs = await loadAndSplitPDF(path);

    // 1. Update VectorStore
    await vectorStore.addDocuments(docs);
    console.log(`✅ Added ${docs.length} docs to LanceDB`);

    // 2. Update BM25
    docs.forEach((doc, i) => {
      bm25Docs.push(doc.pageContent);
      bm25Engine.addDoc({ body: doc.pageContent }, (bm25Docs.length - 1).toString());
    });
    bm25Engine.consolidate();
    console.log("✅ BM25 index updated");

    res.json({ success: true, message: "Index updated!" });
  } catch (err) {
    console.error("❌ Ingest error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// Ask a question
app.post("/ask", async (req, res) => {
  try {
    const { sessionId = "default", question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Missing 'question' field" });
    }

    const result = await graphApp.invoke({ question, sessionId });
    res.json({ sessionId, output: result.output });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---- Start server ----
initPipeline().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });
});
