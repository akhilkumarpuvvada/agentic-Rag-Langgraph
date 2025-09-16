import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import * as lancedb from "@lancedb/lancedb";

export async function initVectorStore(allDocs, embeddings) {
  const db = await lancedb.connect("./lancedb");
  let vectorStore;

  try {
    await db.openTable("docs");
    console.log("✅ Using existing LanceDB table");
    vectorStore = new LanceDB(embeddings, {
      connection: db,
      tableName: "docs",
    });
  } catch {
    console.log("⚠️ Table not found. Creating new...");
    vectorStore = await LanceDB.fromDocuments(allDocs, embeddings, {
      connection: db,
      tableName: "docs",
    });
    console.log("✅ Inserted docs into LanceDB");
  }

  return vectorStore;
}
