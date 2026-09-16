import { REPLY_GRAMMAR, validReply, buildMessages } from "./instructions.mjs";

export function createLlmClient({
  url,
  model,
  instructions,
  timeoutMs,
  maxTokens,
  temperature,
  fetchFn = fetch,
}) {
  return {
    async reply(question, { username, botName, history = [], signal } = {}) {
      if (typeof question !== "string" || !question.trim()) {
        throw new Error("question cannot be empty");
      }

      const timeout = AbortSignal.timeout(timeoutMs);
      const requestSignal = signal
        ? AbortSignal.any([signal, timeout])
        : timeout;

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
          grammar: REPLY_GRAMMAR,
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

      const choice = data?.choices?.[0];
      let text = choice?.message?.content;

      if (choice?.finish_reason === "length") {
        throw new Error("model reached the token limit; no reply sent");
      }

      if (typeof text === "string") {
        text = text.replace(/\s+/g, " ").trim();
      }

      if (choice?.finish_reason !== "stop" || !validReply(text)) {
        throw new Error("model returned an invalid or incomplete reply");
      }

      return text.toLowerCase();
    },
  };
}
