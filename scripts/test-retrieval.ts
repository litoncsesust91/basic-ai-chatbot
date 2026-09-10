import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is missing.");
}

if (!vectorStoreId) {
  throw new Error("OPENAI_VECTOR_STORE_ID is missing.");
}

const openai = new OpenAI({ apiKey });

console.log("Checking Vector Store files...");

const files = await openai.vectorStores.files.list(vectorStoreId);

console.table(
  files.data.map((file) => ({
    fileId: file.id,
    status: file.status,
  })),
);

console.log("\nSearching for Nimbus product information...");

const results = await openai.vectorStores.search(vectorStoreId, {
  query: "Nimbus Travel Backpack colours, price, capacity, and laptop size",
});

console.log(JSON.stringify(results.data, null, 2));