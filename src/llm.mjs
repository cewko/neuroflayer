import {
  loadReplyInstructions,
  REPLY_GRAMMAR,
  validReply,
} from "./instructions.mjs";

export function createLlmClient({
  url,
  model,
  promptPath,
  timeoutMs = 45_000,
  maxTokens = 512,
  temperature = 0.9,
  fetchFn = fetch,
}) {
  let active = null;
  const instructions = loadReplyInstructions(promptPath);

  return {
    async reply(question) {
      if (typeof question !== "string" || !question.trim()) {
        throw new Error("question cannot be empty");
      }

      if (active) throw new Error("model is busy");

      const request = new AbortController();
      active = request;

      const timer = setTimeout(() => {
        request.abort(new Error("model request timed out"));
      }, timeoutMs);

      try {
        const response = await fetchFn(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: request.signal,
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: `${instructions}\n\nquestion: ${question.trim()}`,
              },
            ],
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
        request.signal.throwIfAborted();
        const choice = data?.choices?.[0];
        let text = choice?.message?.content;

        if (choice?.finish_reason === "length") {
          throw new Error(
            "model reached the token limit. ask for a shorter question",
          );
        }

        if (typeof text === "string") text = text.replace(/\s+/g, " ").trim();
        if (choice?.finish_reason !== "stop" || !validReply(text)) {
          throw new Error("model return an invalid or incomplete reply");
        }
        return text.toLowerCase();
      } finally {
        clearTimeout(timer);
        active = null;
      }
    },

    cancel() {
      active?.abort(new Error("model request cancelled"));
    },
  };
}
