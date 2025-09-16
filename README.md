# 🧠 Agentic RAG Chatbot with LangGraph + LanceDB + BM25

This project is a **production-style Retrieval-Augmented Generation (RAG) system** with a **full-stack chatbot interface**.  
It demonstrates how to build, optimize, and deploy AI applications using **LangGraph**, **vector databases**, **hybrid retrieval**, and **guardrails** — all essential skills for **AI Engineering roles**.  

---

## 🚀 Features

### 🔎 Retrieval
- **Hybrid retrieval**: Combines **Vector Search (LanceDB + OpenAI embeddings)** and **BM25 keyword search** for high-precision results.
- **Deduplication & Re-ranking**: Removes duplicate chunks and sorts results by relevance.
- **Persistent storage**: Documents stored in LanceDB for reuse across sessions.

### 🧩 Orchestration (LangGraph)
- Multi-node graph: `Retriever → Router → Answer`  
- **Router** node can decide between:
  - Summarization
  - Comparison
  - Direct answering
  - Fallback if mode unknown
- Future-ready: supports loops, retries, checkpoints, and multi-agent workflows.

### 🛡️ Guardrails (Planned in Phase 3)
- Faithfulness checks to reduce hallucinations.
- Safety filters (PII, toxicity).
- Confidence-based fallback answers.

### ⚡ Performance (Planned in Phase 4)
- Caching of embeddings and responses.
- Async + batched retrieval for efficiency.
- Streaming answers to frontend.

### 📈 Scaling & Deployment (Planned in Phase 5)
- Dockerized backend.
- State persistence with Redis/Postgres.
- Horizontal scaling.
- Monitoring & logging.

### 🧪 Evaluation (Planned in Phase 6)
- Synthetic QA generation.
- Automated evals with **Ragas** / **LangSmith**.
- Human feedback integration.

### 🛠 Tool Use & External APIs (Planned in Phase 7)
- Multi-agent orchestration.
- Integration with **external APIs** (e.g., weather, finance).
- SQL/structured database querying.

---

## 📂 Project Structure

