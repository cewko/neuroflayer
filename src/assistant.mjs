function mentionsAI(message, nickname) {
  if (!nickname) return false;
  const words = message.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
  return words.includes(nickname.toLowerCase());
}

export function createMentionAssistant({ llm, queue, state, send, log }) {
  return {
    handle({ username, message }) {
      const current = state();

      if (current.state !== "ready" || !mentionsAI(message, current.username)) {
        return;
      }

      void queue
        .run(async (signal) => {
          if (state().state !== "ready") {
            throw new Error("bot is not ready");
          }

          const reply = await llm.reply(message, { username, signal });

          signal.throwIfAborted();
          return send(reply);
        })
        .catch((error) => {
          log(`AI for ${username}: ${error.message}`);
        });
    },
  };
}
