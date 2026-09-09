import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { Route } from "./+types/home";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  answer?: string;
  error?: string;
};

const MAX_CONTEXT_MESSAGES = 20;

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hello! How can I help you today?",
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Basic AI Chatbot" },
    {
      name: "description",
      content: "A basic chatbot built with React Router and OpenAI",
    },
  ];
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    WELCOME_MESSAGE,
  ]);

  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messageList = messageListRef.current;

    if (!messageList) {
      return;
    }

    messageList.scrollTo({
      top: messageList.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSubmitting]);

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const message = draft.trim();

    if (!message || isSubmitting) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);

    setDraft("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages
            .slice(-MAX_CONTEXT_MESSAGES)
            .map(({ role, content }) => ({
              role,
              content,
            })),
        }),
      });

      const data = (await response.json()) as ChatResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "The request failed.");
      }

      if (!data.answer) {
        throw new Error("The assistant returned an empty answer.");
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function clearConversation() {
    setMessages([WELCOME_MESSAGE]);
    setDraft("");
    setError("");
  }

  return (
    <main className="chat-page">
      <section className="chat-card">
        <header className="chat-header">
          <div>
            <h1>AI Assistant</h1>
            <p>Basic LLM chatbot</p>
          </div>

          <div className="header-actions">
            <span className="status">
              <span className="status-dot" />
              Online
            </span>

            <button
              className="clear-button"
              type="button"
              onClick={clearConversation}
              disabled={isSubmitting || messages.length === 1}
            >
              Clear
            </button>
          </div>
        </header>

        <div
          ref={messageListRef}
          className="message-list"
          aria-live="polite"
          aria-label="Conversation"
        >
          {messages.map((message) => (
            <article
              className={`message message-${message.role}`}
              key={message.id}
            >
              <strong>
                {message.role === "user"
                  ? "You"
                  : "Assistant"}
              </strong>

              <p>{message.content}</p>
            </article>
          ))}

          {isSubmitting && (
            <article className="message message-assistant">
              <strong>Assistant</strong>
              <p>Thinking…</p>
            </article>
          )}
        </div>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <form
          className="chat-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="message">
            Send a message
          </label>

          <div className="input-row">
            <textarea
              id="message"
              name="message"
              value={draft}
              onChange={(event) =>
                setDraft(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Ask me something..."
              rows={2}
              maxLength={2_000}
              disabled={isSubmitting}
            />

            <button
              type="submit"
              disabled={!draft.trim() || isSubmitting}
            >
              {isSubmitting ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}