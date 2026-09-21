import OpenAI from "openai";

import {
  executeSearchProductsTool,
  SEARCH_PRODUCTS_TOOL_NAME,
  searchProductsTool,
} from "../app/tools/search-products.tool.server";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-6-astra";

if (!apiKey) {
  throw new Error("OPENAI_API_KEY is missing.");
}

const openai = new OpenAI({
  apiKey,
});

const question =
  process.argv.slice(2).join(" ").trim() ||
  "Find a shirt and tell me its current price and stock status.";

console.log("Customer question:");

console.log(question);

console.log("\n1. Asking the model to select a tool...");

const firstResponse = await openai.responses.create({
  model,
  instructions: `
You are an e-commerce product assistant.

For current product prices, sale prices, stock status, SKUs, or
product links, you must use the live WooCommerce product-search tool.

Do not invent product information.
  `.trim(),
  input: question,
  tools: [searchProductsTool],
  tool_choice: "auto",
});

const functionCalls = firstResponse.output.filter(
  (item) => item.type === "function_call",
);

if (functionCalls.length === 0) {
  console.log("\nThe model did not request a function.");

  console.log("Model output:");

  console.log(firstResponse.output_text);

  throw new Error(
    "Expected the model to call search_woocommerce_products.",
  );
}

console.log(
  `\n2. Model requested ${functionCalls.length} function call(s).`,
);

const functionOutputs = await Promise.all(
  functionCalls.map(async (functionCall) => {
    console.log({
      name: functionCall.name,
      arguments: functionCall.arguments,
    });

    let output: string;

    if (functionCall.name === SEARCH_PRODUCTS_TOOL_NAME) {
      output = await executeSearchProductsTool(
        functionCall.arguments,
      );
    } else {
      output = JSON.stringify({
        ok: false,
        error: {
          code: "UNKNOWN_TOOL",
          message: `Unknown tool: ${functionCall.name}`,
        },
      });
    }

    return {
      type: "function_call_output" as const,
      call_id: functionCall.call_id,
      output,
    };
  }),
);

console.log("\n3. Returning the tool results to OpenAI...");

const finalResponse = await openai.responses.create({
  model,
  previous_response_id: firstResponse.id,
  input: functionOutputs,
  tools: [searchProductsTool],
  tool_choice: "auto",
});

console.log("\n4. Final customer-facing answer:");

console.log(finalResponse.output_text);