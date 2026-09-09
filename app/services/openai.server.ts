import OpenAI from "openai";

import { CHATBOT_INSTRUCTIONS } from
  "../config/chatbot.server";

export type ConversationMessage = {
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

export async function streamChatReply(
  messages: ConversationMessage[],
) {
  const model = process.env.OPENAI_MODEL;

  if (!model) {
    throw new Error("OPENAI_MODEL is not configured");
  }

    return getOpenAIClient().responses.create({
      model,
      instructions: CHATBOT_INSTRUCTIONS,
      input: messages,
      stream: true,
      max_output_tokens: 500,
    });
}