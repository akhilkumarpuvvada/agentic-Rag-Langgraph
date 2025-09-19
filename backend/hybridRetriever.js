import { rerank } from "./coherererank.js";
import { queryExpander } from "./queryExapander.js";

function deduplicateDocs(docs) {
  const seen = new Set();
  return docs.filter((d) => {
    const key = d.pageContent.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function hybridRetriever(
  question,
  { vectorStore, bm25Engine, bm25Docs }
) {
  // 1. Expand queries (async-safe)
  const queries = await queryExpander(question);

  // 2. Run all queries concurrently
  const retrievalTasks = queries.map(async (q) => {
    // Fire BM25 + vector in parallel
    const [vectorResults, bm25Results] = await Promise.all([
      vectorStore.similaritySearch(q, 3),
      Promise.resolve(bm25Engine.search(q, 3)), // BM25 is sync → wrap in Promise
    ]);

    // Normalize
    const vectorDocs = vectorResults.map((r) => ({
      pageContent: r.pageContent,
      score: r.score ?? 1.0,
      source: "vector",
    }));

    const bm25DocsOnly = bm25Results.map((r) => ({
      pageContent: bm25Docs[parseInt(r[0])],
      score: r[1],
      source: "bm25",
    }));

    return [...vectorDocs, ...bm25DocsOnly];
  });

  // 3. Wait for all query tasks
  let allResults = (await Promise.all(retrievalTasks)).flat();

  // 4. Deduplicate
  allResults = deduplicateDocs(allResults);

  // 5. Rerank
  const reranked = await rerank(question, allResults, 5);

  if (!reranked || reranked.length === 0) {
    return { context: null, next: "fallback" };
  }

  return { context: reranked.map((d) => d.pageContent).join("\n\n") };
}
