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

type ErrorResponse = {
  error?: string;
};

const MAX_CONTEXT_MESSAGES = 20;

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Welcome to Demo Store! How can I help you today?",
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Demo Store Assistant" },
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

    const assistantId = crypto.randomUUID();
    const updatedMessages = [...messages, userMessage];

    setMessages([
      ...updatedMessages,
      {
        id: assistantId,
        role: "assistant",
        content: "",
      },
    ]);

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

      if (!response.ok) {
        const data =
          (await response.json()) as ErrorResponse;

        throw new Error(
          data.error ?? "The request failed.",
        );
      }

      if (!response.body) {
        throw new Error(
          "The server did not return a response stream.",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          assistantText += decoder.decode();
          break;
        }

        assistantText += decoder.decode(value, {
          stream: true,
        });

        setMessages((current) =>
          current.map((currentMessage) =>
            currentMessage.id === assistantId
              ? {
                  ...currentMessage,
                  content: assistantText,
                }
              : currentMessage,
          ),
        );
      }

      if (!assistantText.trim()) {
        throw new Error(
          "The assistant returned an empty answer.",
        );
      }
    } catch (caughtError) {
      setMessages((current) =>
        current.filter(
          (currentMessage) =>
            currentMessage.id !== assistantId,
        ),
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong.",
      );
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
            <h1>Demo Store Assistant</h1>
            <p>Products, delivery and return support</p>
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

              <p>
              {message.content ||
                (isSubmitting ? "Thinking…" : "")}
              </p>
            </article>
          ))}          
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