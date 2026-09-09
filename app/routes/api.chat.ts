import type { Route } from "./+types/api.chat";
import { generateChatReply } from "../services/openai.server";

const MAX_MESSAGE_LENGTH = 2_000;

export async function action({
  request,
}: Route.ActionArgs) {
  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("message" in body) ||
      typeof body.message !== "string"
    ) {
      return Response.json(
        { error: "A text message is required." },
        { status: 400 },
      );
    }

    const message = body.message.trim();

    if (!message) {
      return Response.json(
        { error: "Message cannot be empty." },
        { status: 400 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return Response.json(
        { error: "Message is too long." },
        { status: 400 },
      );
    }

    const answer = await generateChatReply(message);

    return Response.json({ answer });
  } catch (error) {
    console.error("Chat request failed:", error);

    return Response.json(
      { error: "The assistant could not answer right now." },
      { status: 500 },
    );
  }
}