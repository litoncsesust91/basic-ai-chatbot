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

const results = await openai.vectorStores.search(vectorStoreId, {
  query: "Nimbus Travel Backpack colours price and capacity",
});

console.dir(results.data, {
  depth: 6,
});