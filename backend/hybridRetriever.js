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

  const queries = await queryExpander(question);

  let allResults = [];

  for(const q of queries) {
    const vectorResults = await vectorStore.similaritySearch(q, 3);
    const vectorDocs = vectorResults.map((r) => ({
      pageContent: r.pageContent,
      score: r.score ?? 1.0,
      source: "vector"
    }));

    const bm25Results = bm25Engine.search(q, 3);
    const bm25DocsOnly  = bm25Results.map((r) => ({
      pageContent: bm25Docs[parseInt(r[0])],
      score: r[1],
      source: "bm25"
    }))
    allResults = allResults.concat(vectorDocs, bm25DocsOnly);
  }

  allResults = deduplicateDocs(allResults);

  const reranked = await rerank(question, allResults, 5);
  console.log(reranked, "re");
  
  if(!reranked || reranked.length === 0) {
    return { context: null, next: "fallback"}
  }

 return { context: reranked.map(d => d.pageContent).join("\n\n") };
}
