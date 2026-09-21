import { createReplyGrammar, buildMessages } from "./instructions.mjs";
import { validReply } from "./messages.mjs";

function parseReply(data, maxMessageLength) {
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new Error("model reached the token limit. no reply sent");
  }

  const reply = choice?.message?.content;

  if (
    choice?.finish_reason !== "stop" ||
    !validReply(reply, maxMessageLength)
  ) {
    throw new Error("model returned an invalid or incomplete reply");
  }

  return reply.toLowerCase();
}

export function createLlmClient({
  url,
  model,
  instructions,
  timeoutMs,
  maxTokens,
  temperature,
  maxMessageLength,
  fetchFn = fetch,
}) {
  const grammar = createReplyGrammar(maxMessageLength);

  async function reply(
    question,
    { username, botName, history = [], signal } = {},
  ) {
    if (typeof question !== "string" || !question.trim()) {
      throw new Error("question cannot be empty");
    }
    signal?.throwIfAborted();

    const timeout = new AbortController();
    const timer = setTimeout(() => {
      timeout.abort(
        new DOMException("model request timed out", "TimeoutError"),
      );
    }, timeoutMs);
    timer.unref();
    const requestSignal = signal
      ? AbortSignal.any([signal, timeout.signal])
      : timeout.signal;

    try {
      requestSignal.throwIfAborted();

      const response = await fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: requestSignal,
        body: JSON.stringify({
          model,
          messages: buildMessages({
            instructions,
            question,
            username,
            botName,
            history,
          }),
          grammar,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
      });

      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`model HTTP error: ${response.status}`);
      }

      const data = await response.json();
      requestSignal.throwIfAborted();
      return parseReply(data, maxMessageLength);
    } finally {
      clearTimeout(timer);
    }
  }
  return { reply };
}
