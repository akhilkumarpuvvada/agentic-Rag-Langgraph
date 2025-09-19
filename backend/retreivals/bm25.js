// bm25.js
import bm25 from "wink-bm25-text-search";

function simpleTokenizer(text) {
  return text.toLowerCase().split(/\W+/).filter(Boolean);
}

export function initBM25(allDocs) {
  
  console.log("⚡ Initializing BM25 index...");
  const bm25Engine = bm25();
  const bm25Docs = [];

  bm25Engine.defineConfig({ fldWeights: { body: 1 } });
  bm25Engine.definePrepTasks([simpleTokenizer]);

  allDocs.forEach((doc, i) => {
    bm25Docs.push(doc.pageContent);
    bm25Engine.addDoc({ body: doc.pageContent }, i.toString());
  });

  bm25Engine.consolidate();
  console.log("✅ BM25 index ready");

  return { bm25Engine, bm25Docs };
}
