// pdfLoader.js
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export async function loadAndSplitPDF(path) {
  console.log(`📄 Loading PDF: ${path}`);
  const loader = new PDFLoader(path);
  const rawDocs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 200,
  });

  const docs = await splitter.splitDocuments(rawDocs);

  docs.forEach((d) => (d.metadata = { source: path }));
  console.log(`✅ Split ${docs.length} chunks from ${path}`);

  return docs;
}
