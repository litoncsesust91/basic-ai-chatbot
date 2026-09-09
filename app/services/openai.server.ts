import OpenAI from "openai";

import { CHATBOT_INSTRUCTIONS } from
  "../config/chatbot.server";

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

let client: OpenAI | undefined;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  client ??= new OpenAI({ apiKey });

  return client;
}

export async function streamChatReply(messages: ChatMessage[]) {
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

  if (!vectorStoreId) {
    throw new Error("OPENAI_VECTOR_STORE_ID is missing.");
  }

  return getOpenAIClient().responses.create({
    model: process.env.OPENAI_MODEL || "gpt-6-astra",
    instructions: CHATBOT_INSTRUCTIONS,
    input: messages,
    tools: [
      {
        type: "file_search",
        vector_store_ids: [vectorStoreId],
        max_num_results: 5,
      },
    ],

    // Temporarily require File Search while learning/debugging.
    tool_choice: "required",

    stream: true,
    max_output_tokens: 500,
  });
}