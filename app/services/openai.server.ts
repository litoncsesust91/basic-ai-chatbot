import OpenAI from "openai";

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

export async function generateChatReply(
  messages: ConversationMessage[],
): Promise<string> {
  const model = process.env.OPENAI_MODEL;

  if (!model) {
    throw new Error("OPENAI_MODEL is not configured");
  }

  const response = await getOpenAIClient().responses.create({
    model,
    instructions: [
      "You are a friendly and helpful assistant.",
      "Use earlier messages when answering follow-up questions.",
      "Answer clearly and concisely.",
      "If you do not know something, say that you do not know.",
    ].join(" "),
    input: messages,
  });

  return response.output_text;
}