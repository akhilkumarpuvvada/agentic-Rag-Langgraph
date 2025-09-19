import { CohereClient } from "cohere-ai";
import dotenv from "dotenv";
dotenv.config();

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

export async function rerank(query, docs, topK) {    
    
  if (!docs || docs.length === 0) return [];

  const response = await cohere.v2.rerank({
    model: "rerank-english-v3.0",
    query,
    documents: docs.map(d => d.pageContent),
    topN: docs.length,
  });
  
  // ✅ Map results back using index
  const results = response.results.map(r => {
    const originalDoc = docs[r.index];    
    return {
      pageContent: originalDoc?.pageContent ?? "",
      score: r.relevanceScore,
      source: originalDoc?.source ?? "unknown",
    };
  });

  results.slice((a,b) =>b.score - a.score );
  return results.splice(0, topK)
}
