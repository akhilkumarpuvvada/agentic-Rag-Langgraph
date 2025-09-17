// reranker.js
import { CohereClient } from "cohere-ai";
import dotenv from "dotenv";
dotenv.config();

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

/**
 * Rerank documents based on query relevance.
 * @param {string} query - User question
 * @param {Array<{pageContent: string, score?: number, source?: string}>} docs - Candidate docs
 * @returns {Promise<Array<{pageContent: string, score: number, source?: string}>>}
 */
export async function rerank(query, docs) {    
    
  if (!docs || docs.length === 0) return [];

  const response = await cohere.v2.rerank({
    model: "rerank-english-v3.0",
    query,
    documents: docs.map(d => d.pageContent),
    topN: docs.length,
  });
  
  // ✅ Map results back using index
  return response.results.map(r => {
    const originalDoc = docs[r.index];    
    return {
      pageContent: originalDoc?.pageContent ?? "",
      score: r.relevanceScore,
      source: originalDoc?.source ?? "unknown",
    };
  });
}
