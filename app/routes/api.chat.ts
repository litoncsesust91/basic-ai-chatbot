import type { Route } from "./+types/api.chat";
import {
  streamChatReply,
  type ConversationMessage,
} from "../services/openai.server";

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2_000;

function isConversationMessage(
  value: unknown,
): value is ConversationMessage {
  if (
    typeof value !== "object" ||
    value === null ||
    !("role" in value) ||
    !("content" in value)
  ) {
    return false;
  }

  const validRole =
    value.role === "user" ||
    value.role === "assistant";

  const validContent =
    typeof value.content === "string" &&
    value.content.trim().length > 0 &&
    value.content.length <= MAX_MESSAGE_LENGTH;

  return validRole && validContent;
}

export async function action({
  request,
}: Route.ActionArgs) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("messages" in body) ||
      !Array.isArray(body.messages)
    ) {
      return Response.json(
        { error: "A messages array is required." },
        { status: 400 },
      );
    }

    if (
      body.messages.length === 0 ||
      body.messages.length > MAX_MESSAGES
    ) {
      return Response.json(
        {
          error: `Send between 1 and ${MAX_MESSAGES} messages.`,
        },
        { status: 400 },
      );
    }

    if (!body.messages.every(isConversationMessage)) {
      return Response.json(
        { error: "One or more messages are invalid." },
        { status: 400 },
      );
    }

    const messages = body.messages.map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }));

    const lastMessage = messages.at(-1);

    if (lastMessage?.role !== "user") {
      return Response.json(
        { error: "The final message must be from the user." },
        { status: 400 },
      );
    }

    const openAIStream = await streamChatReply(messages);
    const encoder = new TextEncoder();

    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of openAIStream) {
            if (event.type === "response.output_text.delta") {
              controller.enqueue(
                encoder.encode(event.delta),
              );
            }

            if (event.type === "error") {
              throw new Error(event.message);
            }
          }

          controller.close();
        } catch (error) {
          console.error("Streaming failed:", error);
          controller.error(error);
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Chat request failed:", error);

    return Response.json(
      { error: "The assistant could not answer right now." },
      { status: 500 },
    );
  }
}