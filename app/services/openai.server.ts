import OpenAI from "openai";

import { CHATBOT_INSTRUCTIONS } from "../config/chatbot.server";
import {
  executeSearchProductsTool,
  SEARCH_PRODUCTS_TOOL_NAME,
  searchProductsTool,
} from "../tools/search-products.tool.server";

let openaiClient: OpenAI | undefined;

const MAX_TOOL_ROUNDS = 3;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type FunctionCallOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  openaiClient ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return openaiClient;
}

function getTools(vectorStoreId: string) {
  return [
    {
      type: "file_search" as const,
      vector_store_ids: [vectorStoreId],
      max_num_results: 5,
    },
    searchProductsTool,
  ];
}

async function executeFunction(
  name: string,
  argumentsJson: string,
): Promise<string> {
  if (name === SEARCH_PRODUCTS_TOOL_NAME) {
    return executeSearchProductsTool(argumentsJson);
  }

  return JSON.stringify({
    ok: false,
    error: {
      code: "UNKNOWN_TOOL",
      message: `Unknown tool: ${name}`,
    },
  });
}

export async function* streamChatReply(
  messages: ChatMessage[],
): AsyncGenerator<string> {
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

  if (!vectorStoreId) {
    throw new Error("OPENAI_VECTOR_STORE_ID is missing.");
  }

  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || "gpt-6-astra";
  const tools = getTools(vectorStoreId);

  let previousResponseId: string | undefined;

  let nextInput:
    | ChatMessage[]
    | FunctionCallOutput[] = messages;

  for (
    let toolRound = 0;
    toolRound < MAX_TOOL_ROUNDS;
    toolRound += 1
  ) {
    const responseStream = await client.responses.create({
      model,
      instructions: CHATBOT_INSTRUCTIONS,
      input: nextInput,
      previous_response_id: previousResponseId,
      tools,

      // The model can answer directly, use File Search,
      // or request the WooCommerce function.
      tool_choice: "auto",

      stream: true,
      store: true,
      // temperature: 0.2,
      max_output_tokens: 500,
    });

    let completedResponse:
      | OpenAI.Responses.Response
      | undefined;

    for await (const event of responseStream) {
      if (event.type === "response.output_text.delta") {
        yield event.delta;
      }

      if (event.type === "response.completed") {
        completedResponse = event.response;
      }

      if (event.type === "response.failed") {
        const message =
          event.response.error?.message ||
          "The OpenAI response failed.";

        throw new Error(message);
      }
    }

    if (!completedResponse) {
      throw new Error(
        "OpenAI stream ended without a completed response.",
      );
    }

    const functionCalls = completedResponse.output.filter(
      (item) => item.type === "function_call",
    );

    // No function request means the customer-facing answer is complete.
    if (functionCalls.length === 0) {
      return;
    }

    const functionOutputs: FunctionCallOutput[] =
      await Promise.all(
        functionCalls.map(async (functionCall) => {
          // Temporary development log.
          console.log(
            `[Tool] Executing ${functionCall.name}`,
          );

          const output = await executeFunction(
            functionCall.name,
            functionCall.arguments,
          );

          return {
            type: "function_call_output" as const,
            call_id: functionCall.call_id,
            output,
          };
        }),
      );

    previousResponseId = completedResponse.id;
    nextInput = functionOutputs;
  }

  throw new Error(
    `Maximum tool rounds (${MAX_TOOL_ROUNDS}) exceeded.`,
  );
}