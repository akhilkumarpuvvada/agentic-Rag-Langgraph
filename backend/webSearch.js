// webSearch.js
import { TavilyClient } from "tavily";
import dotenv from "dotenv";
dotenv.config();

const client = new TavilyClient({ apiKey: process.env.TAVILY_API_KEY });

export async function webSearch(query) {
  console.log("🔵 Running WebSearch with Tavily...");

  try {
    const results = await client.search(query, {
      includeAnswer: "basic",
      maxResults: 3,
    });
console.log(results, "results");

    if (!results) {
      console.log("⚠️ Tavily returned no results");
      return null;
    }

    // ✅ Prefer direct `answer` field
    if (results.answer) {
      return results.answer;
    }

    // ✅ Otherwise, fallback to snippets
    if (results.results && results.results.length > 0) {
      return results.results.map(r => r.content || r.snippet).join("\n\n");
    }

    return null;
  } catch (err) {
    console.error("❌ WebSearch error:", err.message);
    return null;
  }
}
