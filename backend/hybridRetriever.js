// hybridRetriever.js
// Simple deduplication by content
function deduplicateDocs(docs) {
  const seen = new Set();
  return docs.filter(d => {
    const key = d.pageContent.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function hybridRetriever(question, { vectorStore, bm25Engine, bm25Docs }) {
  // 1. Embedding retriever
  const vectorResults = await vectorStore.similaritySearch(question, 5);

  // 2. BM25 retriever
  const bm25Results = bm25Engine.search(question, 5);
  const bm25DocsOnly = bm25Results.map(r => ({
    pageContent: bm25Docs[parseInt(r[0])],
    score: r[1], // BM25 score
    source: "bm25",
  }));

  // 3. Normalize vector scores (higher = better)
  const vectorDocs = vectorResults.map(d => ({
    pageContent: d.pageContent,
    score: d.score ?? 1.0, // fallback if score missing
    source: "vector",
  }));

  // 4. Merge
  let merged = [...vectorDocs, ...bm25DocsOnly];

  // 5. Deduplicate
  merged = deduplicateDocs(merged);

  // 6. Re-rank (simple: sort by score desc)
  merged.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // 7. Return top N
  return merged.slice(0, 5).map(d => ({ pageContent: d.pageContent }));
}
