import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is missing");
}

const openai = new OpenAI({ apiKey });

const knowledgePath = path.resolve(
  "knowledge/store-faq.md",
);

if (!fs.existsSync(knowledgePath)) {
  throw new Error(
    `Knowledge file not found: ${knowledgePath}`,
  );
}

console.log("Creating vector store...");

const vectorStore = await openai.vectorStores.create({
  name: "Demo Store Knowledge",
});

console.log(`Vector store created: ${vectorStore.id}`);
console.log("Uploading and indexing knowledge...");

const vectorStoreFile =
  await openai.vectorStores.files.uploadAndPoll(
    vectorStore.id,
    fs.createReadStream(knowledgePath),
  );

if (vectorStoreFile.status !== "completed") {
  throw new Error(
    `Ingestion failed with status: ${vectorStoreFile.status}`,
  );
}

console.log("Knowledge ingestion completed.");
console.log("");
console.log(
  `OPENAI_VECTOR_STORE_ID=${vectorStore.id}`,
);
console.log("");
console.log(
  "Copy the line above into your .env file.",
);